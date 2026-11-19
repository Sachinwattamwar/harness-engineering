#!/usr/bin/env node
/**
 * run-eval.js — eval runner for the NL Reminder Agent.
 *
 * Covers: FR-015, FR-022, AC-024, AC-025, SC-001–008
 *
 * Refuses to run when LLM_PROVIDER=stub (FR-022, AC-025).
 * For each case in evals/dataset.json, runs the CLI 3× at temperature 0.
 * Computes weighted aggregate score, writes evidence files.
 */
import { spawnSync } from "child_process";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, appendFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { validateOutput } from "./schema-validator.js";
import { checkInvariants, checkAssertions } from "./invariant-checker.js";
import { evaluateSemantic } from "./semantic-evaluator.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// FR-022, AC-025: refuse to run with stub provider
if (process.env.LLM_PROVIDER === "stub") {
  process.stderr.write(
    "[eval] ERROR: eval cannot run with stub provider. Set LLM_PROVIDER to a real provider.\n"
  );
  process.exit(1);
}

const DATASET_PATH = join(ROOT, "evals", "dataset.json");
const EVIDENCE_DIR = join(ROOT, "evidence");
const EVAL_RUNS_DIR = join(EVIDENCE_DIR, "eval-runs");
const EVAL_RESULTS_PATH = join(EVIDENCE_DIR, "eval-results.json");
const EVAL_RESULTS_JSONL = join(ROOT, "specs", "001-nl-reminder-agent", "eval-results.jsonl");

mkdirSync(EVAL_RUNS_DIR, { recursive: true });
mkdirSync(EVIDENCE_DIR, { recursive: true });

// Load dataset
let dataset;
try {
  dataset = JSON.parse(readFileSync(DATASET_PATH, "utf8"));
} catch (err) {
  process.stderr.write(`[eval] Failed to load dataset: ${err.message}\n`);
  process.exit(1);
}

// Determine run number
const existingRuns = readdirSync(EVAL_RUNS_DIR).filter((f) =>
  f.startsWith("run-")
);
const runId = existingRuns.length + 1;
const timestamp = new Date().toISOString();

const provider = process.env.LLM_PROVIDER ?? "openai";
const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

/**
 * Determine case weight from mappedIds.
 * GR → 3, INV/PROP → 2, FR/AC/SEM → 1
 */
function caseWeight(mappedIds) {
  if (mappedIds.some((id) => id.startsWith("GR-"))) return 3;
  if (mappedIds.some((id) => id.startsWith("INV-") || id.startsWith("PROP-"))) return 2;
  return 1;
}

/**
 * Runs the CLI once and returns { exitCode, stdout, stderr, output }.
 * @param {string} text
 * @param {string} referenceNow
 * @param {string|undefined} timezone
 * @param {number} expectedExitCode - If 4, simulates an unreachable endpoint
 */
function runCLI(text, referenceNow, timezone, expectedExitCode = 0) {
  const args = [
    "bin/remind.js",
    text,
    "--now",
    referenceNow,
  ];
  if (timezone) {
    args.push("--timezone", timezone);
  }

  const env = {
    ...process.env,
    LLM_PROVIDER: provider,
    LLM_MODEL: model,
    // Simulate unreachable endpoint for service-error test cases
    ...(expectedExitCode === 4
      ? { OPENAI_BASE_URL: "http://localhost:9999" }
      : {}),
  };

  const result = spawnSync("node", args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
    timeout: 120000,
  });

  const stdoutStr = result.stdout ?? "";
  let output = null;
  if (result.status === 0 && stdoutStr.trim().startsWith("{")) {
    try {
      output = JSON.parse(stdoutStr.trim());
    } catch {
      output = null;
    }
  }

  return {
    exitCode: result.status ?? 1,
    stdout: stdoutStr,
    stderr: result.stderr ?? "",
    output,
  };
}

const caseResults = [];
let totalWeightedScore = 0;
let totalWeight = 0;
let totalErrors = 0;

for (const evalCase of dataset) {
  const { id, input, assertions = {}, mappedIds = [] } = evalCase;
  const expectedExitCode = evalCase.expected_exit_code ?? assertions.expected_exit_code ?? 0;
  const semChecks = assertions.semChecks ?? [];
  const weight = caseWeight(mappedIds);

  process.stdout.write(`[eval] Running case ${id} (weight=${weight})...\n`);

  const runScores = [];
  const layer1Results = [];
  const layer2Results = [];
  const layer3Results = [];
  let errorRuns = 0;

  const runOutputs = [];

  for (let run = 0; run < 3; run++) {
    const { exitCode, stdout, stderr, output } = runCLI(
      input.text,
      input.referenceNow,
      input.timezone,
      expectedExitCode
    );

    runOutputs.push({ exitCode, output, stdout, stderr });

    // ERROR classification: CLI exits 4 AND expected_exit_code !== 4
    if (exitCode === 4 && expectedExitCode !== 4) {
      errorRuns++;
      runScores.push(0);
      layer1Results.push(false);
      layer2Results.push({});
      layer3Results.push({ semanticScore: 0 });
      continue;
    }

    // Layer 1: schema validation
    let layer1Pass = false;
    if (exitCode === expectedExitCode && expectedExitCode !== 0) {
      // Expected non-zero exit — no output to validate
      layer1Pass = true;
    } else if (output != null) {
      const { valid } = validateOutput(output);
      layer1Pass = valid;
    }
    layer1Results.push(layer1Pass);

    // Layer 2: invariant checks
    let layer2 = {};
    if (layer1Pass) {
      layer2 = checkInvariants(output, { ...assertions, mappedIds }, {
        referenceNow: input.referenceNow,
        exitCode,
        stdout: [stdout],
      });
    }
    layer2Results.push(layer2);

    // Layer 3: semantic checks
    let layer3 = { semanticScore: 1 };
    if (layer1Pass && output != null && semChecks.length > 0) {
      const semResult = evaluateSemantic(output, input.text, semChecks);
      layer3 = { ...semResult.scores, semanticScore: semResult.semanticScore };
    }
    layer3Results.push(layer3);

    // Assertion checks
    const { passed: assertPassed } = checkAssertions(output, assertions, {
      exitCode,
    });

    // Run score: layer1 + all layer2 + all layer3 + assertions must pass
    const layer2Pass = Object.values(layer2).every(Boolean);
    const layer3SemScore = layer3.semanticScore ?? 1;
    const runPassed =
      layer1Pass &&
      layer2Pass &&
      layer3SemScore >= 0.75 &&
      assertPassed;

    runScores.push(runPassed ? 1 : 0);
  }

  const nonErrorRuns = 3 - errorRuns;
  const meanScore =
    nonErrorRuns > 0
      ? runScores.reduce((s, v) => s + v, 0) / 3
      : 0;

  // Flakiness detection
  const nonErrorOutputs = runOutputs.filter(
    (r) => !(r.exitCode === 4 && expectedExitCode !== 4)
  );
  const flakyFields = [];
  if (nonErrorOutputs.length === 3) {
    const intents = nonErrorOutputs.map((r) => r.output?.intent);
    if (new Set(intents).size > 1) flakyFields.push("intent");

    const priorities = nonErrorOutputs.map((r) => r.output?.priority);
    if (new Set(priorities).size > 1) flakyFields.push("priority");

    const dues = nonErrorOutputs
      .map((r) => r.output?.due)
      .filter((d) => d != null);
    if (dues.length > 1) {
      const times = dues.map((d) => new Date(d).getTime());
      const spread = Math.max(...times) - Math.min(...times);
      if (spread > 60000) flakyFields.push("due");
    }
  }
  const flaky = flakyFields.length > 0;

  caseResults.push({
    caseId: id,
    runScores,
    meanScore,
    weight,
    layer1Results,
    layer2Results,
    layer3Results,
    flaky,
    flakyFields,
    errorRuns,
  });

  if (errorRuns < 3) {
    totalWeightedScore += meanScore * weight;
    totalWeight += weight;
  }
  totalErrors += errorRuns;

  process.stdout.write(
    `[eval] Case ${id}: meanScore=${meanScore.toFixed(3)} errorRuns=${errorRuns} flaky=${flaky}\n`
  );
}

const aggregateScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

// Thresholds
const layer1AllPass = caseResults.every((c) =>
  c.layer1Results.filter((_, i) => !isErrorRun(c, i)).every(Boolean)
);
const guardrailCases = caseResults.filter((c) => c.weight === 3);
const guardrailPass =
  guardrailCases.length === 0 ||
  guardrailCases.every((c) => c.meanScore === 1.0);
const aggregatePass = aggregateScore >= 0.85;

const result = layer1AllPass && guardrailPass && aggregatePass ? "PASS" : "FAIL";

function isErrorRun(caseResult, runIndex) {
  return caseResult.errorRuns > 0 && caseResult.runScores.length > runIndex;
}

const runRecord = {
  runId,
  timestamp,
  provider,
  model,
  temperature: 0,
  promptVersion: "v1",
  harnessVersion: "1.0.0",
  cases: caseResults,
  aggregateScore,
  result,
  errorCount: totalErrors,
};

// Write evidence/eval-results.json (overwrite each run)
writeFileSync(EVAL_RESULTS_PATH, JSON.stringify(runRecord, null, 2));

// Write evidence/eval-runs/run-<n>-<timestamp>.json (never deleted)
const perRunPath = join(
  EVAL_RUNS_DIR,
  `run-${runId}-${timestamp.replace(/[:.]/g, "-")}.json`
);
writeFileSync(perRunPath, JSON.stringify(runRecord, null, 2));

// Append to eval-results.jsonl (best-effort)
try {
  appendFileSync(EVAL_RESULTS_JSONL, JSON.stringify(runRecord) + "\n");
} catch {
  // Non-fatal — JSONL file may not exist yet
}

process.stdout.write(`\n[eval] ===== RESULT: ${result} =====\n`);
process.stdout.write(`[eval] aggregateScore=${aggregateScore.toFixed(3)} (threshold ≥0.85)\n`);
process.stdout.write(`[eval] layer1AllPass=${layer1AllPass} guardrailPass=${guardrailPass}\n`);
process.stdout.write(`[eval] Evidence: ${EVAL_RESULTS_PATH}\n`);
process.stdout.write(`[eval] Per-run:  ${perRunPath}\n`);

process.exit(result === "PASS" ? 0 : 1);
