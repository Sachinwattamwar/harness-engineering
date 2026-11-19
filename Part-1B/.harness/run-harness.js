#!/usr/bin/env node
/**
 * run-harness.js — sequential gate runner.
 * Runs: npm run lint → npm run security → npm run test
 * Exits 1 on first failure, 0 if all pass.
 * Writes structured failure evidence to evidence/harness-results/.
 */
import { spawnSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const EVIDENCE_DIR = join(ROOT, "evidence", "harness-results");

mkdirSync(EVIDENCE_DIR, { recursive: true });

const gates = ["lint", "security", "test"];
const results = { timestamp: new Date().toISOString(), gates: [] };

for (const gate of gates) {
  process.stdout.write(`[harness] Running: npm run ${gate} ...\n`);
  const result = spawnSync("npm", ["run", gate], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });

  const passed = result.status === 0;
  results.gates.push({ gate, passed, exitCode: result.status });

  if (!passed) {
    results.result = "FAIL";
    results.failedGate = gate;
    const evidencePath = join(
      EVIDENCE_DIR,
      `harness-${Date.now()}.json`
    );
    writeFileSync(evidencePath, JSON.stringify(results, null, 2));
    process.stderr.write(
      `[harness] FAIL: gate '${gate}' exited ${result.status}. Evidence: ${evidencePath}\n`
    );
    process.exit(1);
  }
  process.stdout.write(`[harness] PASS: ${gate}\n`);
}

results.result = "PASS";
const evidencePath = join(EVIDENCE_DIR, `harness-${Date.now()}.json`);
writeFileSync(evidencePath, JSON.stringify(results, null, 2));
process.stdout.write(`[harness] All gates passed.\n`);
process.exit(0);
