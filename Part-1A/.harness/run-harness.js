#!/usr/bin/env node
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EVIDENCE_DIR = path.join(ROOT, "evidence", "harness-results");

async function runGate(name, script) {
  const start = Date.now();
  let stdout = "";
  let stderr = "";
  let exitCode = 0;
  try {
    const result = await execFileAsync("npm", ["run", script], {
      cwd: ROOT,
      env: { ...process.env },
      shell: false,
    });
    stdout = result.stdout || "";
    stderr = result.stderr || "";
  } catch (err) {
    stdout = err.stdout || "";
    stderr = err.stderr || "";
    exitCode = err.code ?? 1;
  }
  return {
    gate: name,
    script,
    exitCode,
    stdout,
    stderr,
    passed: exitCode === 0,
    durationMs: Date.now() - start,
  };
}

function firstLines(text, n) {
  return text.split("\n").slice(0, n).join("\n");
}

function extractFailureSummary(gate) {
  if (gate.passed) return null;
  const combined = (gate.stdout + "\n" + gate.stderr).trim();
  // Try to extract first meaningful failure line
  const lines = combined.split("\n").filter((l) => l.trim().length > 0);
  const failLine = lines.find(
    (l) =>
      l.toLowerCase().includes("fail") ||
      l.toLowerCase().includes("error") ||
      l.toLowerCase().includes("×") ||
      l.toLowerCase().includes("✗")
  ) || lines[0] || "";
  return {
    observedBehaviour: failLine,
    expectedBehaviour:
      gate.gate === "lint"
        ? "ESLint must report 0 errors (Constitution §I)"
        : gate.gate === "security"
        ? "Semgrep p/javascript+p/nodejs 0 findings; npm audit 0 high/critical vulnerabilities (Constitution §I)"
        : "All Vitest tests pass; line coverage ≥85% on src/ (Constitution §II)",
  };
}

async function countExistingRuns() {
  try {
    const files = await fs.readdir(EVIDENCE_DIR);
    return files.filter((f) => f.match(/^run-\d+-.+\.json$/)).length;
  } catch {
    return 0;
  }
}

async function main() {
  await fs.mkdir(EVIDENCE_DIR, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runNumber = (await countExistingRuns()) + 1;
  const baseName = `run-${runNumber}-${timestamp}`;

  console.log(`\n=== HARNESS RUN ${runNumber} (${new Date().toISOString()}) ===\n`);

  const gateSpecs = [
    { name: "lint", script: "lint" },
    { name: "security", script: "security" },
    { name: "test", script: "test" },
  ];

  const results = [];
  let allPassed = true;

  for (const spec of gateSpecs) {
    console.log(`Running gate: ${spec.name}...`);
    const result = await runGate(spec.name, spec.script);
    results.push(result);
    if (!result.passed) {
      allPassed = false;
      console.log(`  ✗ FAIL (exit ${result.exitCode})`);
    } else {
      console.log(`  ✓ PASS`);
    }
  }

  // Build JSON evidence
  const jsonEvidence = {
    runNumber,
    timestamp: new Date().toISOString(),
    overall: allPassed ? "PASS" : "FAIL",
    gates: results.map((g) => ({
      ...g,
      failureSummary: extractFailureSummary(g),
    })),
  };

  // Build Markdown summary
  const mdLines = [
    `# Harness Run ${runNumber}`,
    ``,
    `**Timestamp**: ${new Date().toISOString()}`,
    `**Overall**: ${allPassed ? "✅ PASS" : "❌ FAIL"}`,
    ``,
    `## Gates`,
    ``,
  ];
  for (const g of results) {
    mdLines.push(`### Gate: ${g.gate} — ${g.passed ? "✅ PASS" : "❌ FAIL"}`);
    mdLines.push(`Exit code: ${g.exitCode} | Duration: ${g.durationMs}ms`);
    mdLines.push(``);
    const output = firstLines((g.stdout + "\n" + g.stderr).trim(), 10);
    if (output) {
      mdLines.push("```");
      mdLines.push(output);
      mdLines.push("```");
    }
    if (!g.passed) {
      const fs2 = extractFailureSummary(g);
      if (fs2) {
        mdLines.push(`**Expected**: ${fs2.expectedBehaviour}`);
        mdLines.push(`**Observed**: ${fs2.observedBehaviour}`);
      }
    }
    mdLines.push(``);
  }
  mdLines.push(`---`);
  mdLines.push(`HARNESS: ${allPassed ? "PASS" : "FAIL"}`);

  const jsonPath = path.join(EVIDENCE_DIR, `${baseName}.json`);
  const mdPath = path.join(EVIDENCE_DIR, `${baseName}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(jsonEvidence, null, 2), "utf8");
  await fs.writeFile(mdPath, mdLines.join("\n"), "utf8");

  console.log(`\nEvidence written:`);
  console.log(`  ${jsonPath}`);
  console.log(`  ${mdPath}`);
  console.log(`\nHARNESS: ${allPassed ? "PASS" : "FAIL"}`);

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Harness runner error:", err);
  process.exit(1);
});
