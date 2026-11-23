#!/usr/bin/env node
/**
 * pre-tool-use.js — PreToolUse hook for the NL Reminder Agent project.
 *
 * BLOCKS:
 *  - Edit/Write on protected test/harness/config artifacts
 *  - Bash commands that modify protected files or install new packages
 *  - Any Read of .env (credential hygiene)
 *
 * ALLOWS:
 *  - Edit/Write on src/**, bin/**, prompts/**, evidence/** (non-protected)
 *  - Read of any file except .env
 *  - Bash commands that don't match blocked patterns
 */

import { readFileSync } from "fs";

// Protected glob patterns — block Edit/Write/Bash-writes on these paths
const PROTECTED_PATTERNS = [
  /^tests\//,
  /^evals\//,
  /^\.harness\//,
  /^evidence\/eval-runs\//,
  /^evidence\/eval-results\.json$/,
  /^evidence\/harness-results\//,
  /^vitest\.config\.js$/,
  /^eslint\.config\.js$/,
  /^package\.json$/,
  /^\.claude\/settings\.json$/,
  /^\.claude\/hooks\//,
];

function isProtectedPath(filePath) {
  if (!filePath) return false;
  // Normalise: strip leading ./ and project root prefix
  const normalised = filePath
    .replace(/^\.\//, "")
    .replace(
      /^.*\/harness-engineering\/Part-1B\//,
      ""
    );
  return PROTECTED_PATTERNS.some((re) => re.test(normalised));
}

function isDotEnvPath(filePath) {
  if (!filePath) return false;
  return /(?:^|[\\/])\.env(?:\.[a-zA-Z0-9]+)?$/.test(filePath) &&
    !/\.env\.example$/.test(filePath);
}

// Read stdin
let inputData = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  inputData += chunk;
});

process.stdin.on("end", () => {
  let payload;
  try {
    payload = JSON.parse(inputData);
  } catch {
    // Can't parse — allow
    process.exit(0);
  }

  const toolName = payload?.tool_name ?? payload?.tool ?? "";
  const toolInput = payload?.tool_input ?? payload?.input ?? {};

  // ── Read tool: block .env reads ─────────────────────────────────────────
  if (toolName === "Read") {
    const fp = toolInput?.file_path ?? "";
    if (isDotEnvPath(fp)) {
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: `[HOOK] Reading .env files is blocked for credential hygiene. File: ${fp}`,
        })
      );
      process.exit(2);
    }
    process.exit(0);
  }

  // ── Edit / Write tool: block protected paths ─────────────────────────────
  if (toolName === "Edit" || toolName === "Write") {
    const fp = toolInput?.file_path ?? "";
    if (isProtectedPath(fp)) {
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: `[HOOK] ${toolName} blocked on protected artifact: ${fp}. These files are managed by the test/harness phase only.`,
        })
      );
      process.exit(2);
    }
    process.exit(0);
  }

  // ── Bash tool ────────────────────────────────────────────────────────────
  if (toolName === "Bash") {
    const command = toolInput?.command ?? "";

    // Block reads of .env via bash (cat, grep, head, tail, less, etc.)
    if (
      /(?:^|[;&|]\s*)(?:cat|grep|head|tail|less|more|sed|awk|python3?\s+-c\s+.*open|node\s+-e\s+.*readFile)\s+.*\.env(?:\s|$|'|")/i.test(
        command
      ) ||
      /\$\(cat\s+.*\.env\)/i.test(command)
    ) {
      process.stdout.write(
        JSON.stringify({
          decision: "block",
          reason: "[HOOK] Reading .env via Bash is blocked for credential hygiene.",
        })
      );
      process.exit(2);
    }

    // Block npm install <package> (but allow plain npm install)
    if (/\bnpm\s+install\s+[^-\s]/.test(command)) {
      // Allow if it's just 'npm install' with flags (no package name)
      // Block if there's an actual package name after 'install'
      const installMatch = command.match(/npm\s+install\s+(.+)/);
      if (installMatch) {
        const rest = installMatch[1].trim();
        // If only flags (starting with -), allow
        if (!rest.startsWith("-")) {
          process.stdout.write(
            JSON.stringify({
              decision: "block",
              reason: `[HOOK] npm install <pkg> is blocked. Use only 'npm install' (from package.json) or update package.json and run 'npm install'. Command: ${command}`,
            })
          );
          process.exit(2);
        }
      }
    }

    // Block bash writes to protected paths (echo >>, tee, mv, cp, sed -i, etc.)
    const PROTECTED_NAMES = /tests\/|evals\/|\.harness\/|evidence\/eval-runs|evidence\/eval-results|evidence\/harness-results|vitest\.config\.js|eslint\.config\.js|package\.json|\.claude\/settings\.json|\.claude\/hooks\//;
    const writePatterns = [
      /\b(?:echo|printf|tee|cat\s*>)\s.*(?:tests\/|evals\/|\.harness\/|vitest\.config\.js|eslint\.config\.js|package\.json|\.claude\/)/,
      /\b(?:mv|cp)\s+\S+\s+(?:tests\/|evals\/|\.harness\/|\.claude\/)/,
      />\s*(?:tests\/|evals\/|\.harness\/|evidence\/eval-results\.json|vitest\.config\.js|eslint\.config\.js|package\.json|\.claude\/)/,
    ];
    for (const re of writePatterns) {
      if (re.test(command)) {
        process.stdout.write(
          JSON.stringify({
            decision: "block",
            reason: `[HOOK] Bash command blocked: would modify a protected artifact. Command: ${command.substring(0, 100)}`,
          })
        );
        process.exit(2);
      }
    }

    // Block inline scripts (python3 -c, node -e, perl -e) that write to protected paths
    if (PROTECTED_NAMES.test(command)) {
      const inlineWritePattern = /\b(?:python3?|node|perl)\s+(?:-[ce]\s+|<<)/i;
      if (inlineWritePattern.test(command)) {
        process.stdout.write(
          JSON.stringify({
            decision: "block",
            reason: `[HOOK] Inline script (python3 -c / node -e / perl) blocked: references protected path. Command: ${command.substring(0, 120)}`,
          })
        );
        process.exit(2);
      }
    }

    // Block .env reads via inline scripts (python3 -c open(.env), node -e readFileSync(.env))
    if (/\.env(?!\s*\.)/.test(command)) {
      if (/\b(?:python3?|node|perl)\s+(?:-[ce]\s+|<<)/i.test(command)) {
        process.stdout.write(
          JSON.stringify({
            decision: "block",
            reason: "[HOOK] Inline script blocked: attempts to read .env.",
          })
        );
        process.exit(2);
      }
    }
    process.exit(0);
  }

  // All other tools: allow
  process.exit(0);
});
