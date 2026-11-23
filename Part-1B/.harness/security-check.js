#!/usr/bin/env node
/**
 * security-check.js — runs semgrep (optional) + npm audit --audit-level=high
 * Exits 0 if all checks pass, 1 if any fail.
 */
import { spawnSync } from "child_process";

let exitCode = 0;

// Semgrep (best-effort — skip if not installed)
const semgrep = spawnSync(
  "semgrep",
  ["scan", "--config=auto", "--error", "src", "bin", ".harness"],
  { stdio: "inherit", shell: false }
);
if (semgrep.error) {
  // Not installed — skip
  console.warn("[security] semgrep not found — skipping semgrep scan");
} else if (semgrep.status !== 0) {
  console.error("[security] semgrep reported findings");
  exitCode = 1;
}

// npm audit
const audit = spawnSync("npm", ["audit", "--audit-level=high"], {
  stdio: "inherit",
  shell: false,
});
if (audit.status !== 0) {
  console.error("[security] npm audit reported high/critical vulnerabilities");
  exitCode = 1;
}

process.exit(exitCode);
