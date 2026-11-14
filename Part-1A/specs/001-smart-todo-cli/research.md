# Research: Smart Todo CLI

**Date**: 2026-11-14 | **Branch**: `001-smart-todo-cli`

All technical decisions were supplied explicitly in the planning arguments. This document records
the decisions and their rationale for traceability. No NEEDS CLARIFICATION items were raised.

---

## Decision: Runtime — Node.js 22+ with ES Modules

**Decision**: Node.js 22 LTS, `"type": "module"` in package.json. All source files use
`import`/`export`; no CommonJS `require()`.

**Rationale**: Node.js 22 ships with stable `node:fs/promises`, the `--experimental-vm-modules`
flag (needed by Vitest for ESM) is no longer experimental, and `import.meta.url` / `import.meta.dirname`
are available without polyfills. Using `"type": "module"` avoids mixed-module confusion and aligns
with the security constraint prohibiting dynamic `require()` of user input.

**Alternatives considered**: TypeScript — adds a compile step and `.d.ts` overhead not justified
for a single-developer CLI tool.

---

## Decision: CLI Framework — Commander

**Decision**: `commander` v12+ for argument parsing, sub-commands, `--json` global option, and
error handling.

**Rationale**: Commander is the most widely used Node.js CLI framework, provides typed option
parsing, automatic `--help` generation, and clean error propagation without shell dependency.
It supports `program.exitOverride()` to prevent automatic `process.exit()` calls, allowing
contract tests to capture exit codes without spawning a separate process — though for the
harness we spawn anyway.

**Alternatives considered**:
- `yargs` — heavier, more configuration; overkill for a fixed command set
- Manual `process.argv` parsing — no validation, no `--help`, maintenance burden

---

## Decision: Persistence — node:fs/promises + Atomic Write

**Decision**: `node:fs/promises` only (no third-party file I/O library). Atomic write pattern:
1. Serialise store to `JSON.stringify`
2. Write to `<targetPath>.tmp` via `fs.writeFile`
3. Rename `<targetPath>.tmp` → `<targetPath>` via `fs.rename`

This is atomic on POSIX (Linux/macOS) when source and destination are on the same filesystem,
which is always true for a `.tmp` sibling file. On first run (file absent) write normally and
create the file; `nextId` starts at 1.

**Rationale**: Satisfies FR-037 (atomic write), FR-038 (missing file = empty store), and the
constitution's Principle IV without introducing a dependency. Using `.tmp` as suffix makes it
easy to test for leftover temp files (AC-056).

**Alternatives considered**: `write-file-atomic` npm package — additional dependency; the
three-line pattern is equivalent and avoids supply-chain surface area.

---

## Decision: Testing — Vitest + @vitest/coverage-v8

**Decision**: Vitest as test runner with the V8 coverage provider. Coverage thresholds set at
`lines: 85` in `vitest.config.js`. Contract tests use `node:child_process execFile` to spawn
`node bin/smart-todo.js` — no `shell: true`.

**Rationale**: Vitest supports ES modules natively without babel transform, integrates with V8
coverage (same engine as Node.js, no instrumentation artefacts), and runs in `--run` mode for
CI. Using `execFile` without shell eliminates shell injection risk in the test harness itself,
consistent with the security constraint.

**Contract test design**: Each contract test file sets `TODO_FILE` to a unique temporary path
(created fresh per test), spawns the CLI, captures `{ stdout, stderr, exitCode }`, and asserts
against the AC's Given/When/Then criteria. No internal module is imported.

**Alternatives considered**: Jest — slower ESM support; requires `--experimental-vm-modules` or
babel; Vitest is the natural successor for ESM projects.

---

## Decision: Linting — ESLint Flat Config + eslint-plugin-security

**Decision**: ESLint v9 with flat config (`eslint.config.js`). Rules: `@eslint/js` recommended
+ `eslint-plugin-security` recommended. No `eslint-disable` comments unless accompanied by a
justification comment citing the specific rule, reason, and issue/PR reference.

**Rationale**: Flat config is the standard from ESLint v9 onwards and avoids legacy `.eslintrc`
confusion. `eslint-plugin-security` catches `eval`, unsafe `RegExp`, path traversal patterns,
and `child_process` misuse — all directly relevant to the security constraints.

**Alternatives considered**: Biome — does not support `eslint-plugin-security`; dual-purpose
linter/formatter but drops security rules.

---

## Decision: SAST — Semgrep p/javascript + p/nodejs

**Decision**: `semgrep --config p/javascript --config p/nodejs src/ bin/` as the security gate.
Run via `npm run security` and also within the harness gate 2.

**Rationale**: Semgrep's managed rulesets catch dangerous patterns (command injection via
`shell:true`, prototype pollution, `eval`, insecure regex) that ESLint alone does not cover.
Running on `src/` and `bin/` only (not `tests/` or `.harness/`) keeps signal-to-noise high.

**Alternatives considered**: CodeQL — requires GitHub Actions integration; overkill for a local
harness. Snyk — network dependency; violates the no-network-access principle for the CLI itself
(though `npm audit` is acceptable for the development toolchain).

---

## Decision: Harness Runner Architecture

**Decision**: `.harness/run-harness.js` — a plain Node.js ES module script that:
1. Runs `npm run lint` via `execFile('npm', ['run', 'lint'])` — Gate 1
2. Runs `npm run security` — Gate 2
3. Runs `npm run test` (includes coverage) — Gate 3
4. Collects exit codes, stdout/stderr from each gate
5. Writes `evidence/harness-results/<ISO-timestamp>.json` with gate results, pass/fail summary
6. Writes a human-readable `.txt` summary alongside
7. Exits non-zero if any gate failed

Gates are executed sequentially and all gates run even if an earlier gate fails (collect full
evidence before aborting), but the final exit code is non-zero if any gate failed.

**Rationale**: Independent of the application code; uses only `node:child_process` and
`node:fs/promises`; writes structured evidence for auditing.

---

## Decision: Output Format

**Decision**: 
- **Tables** (`list`, `show`): hand-rolled column formatter using `String.padEnd()`. No
  third-party table library to avoid dependency and security audit noise.
- **JSON** (`--json`): `JSON.stringify(task, null, 2)` for single objects; compact
  `JSON.stringify(tasks)` for arrays.
- **One-line confirmations** (all other commands): plain string to stdout, e.g. `Task 1 created.`
- **Errors**: always to stderr via `process.stderr.write()` or `console.error()`; never to stdout.

**Rationale**: Minimal dependencies; predictable field names for contract test assertions.

---

## Decision: ID and Path Validation

**Decision**:
- Task ID arguments: parsed with `parseInt(arg, 10)`; reject if `isNaN` or `<= 0` → exit 1
- `TODO_FILE` path: check for `..` segments via `filePath.split(path.sep).includes('..')` or
  regex; then `path.resolve()` to absolute. Validation happens on every command invocation
  before any file I/O.

**Rationale**: Satisfies FR-036, FR-044. The `..` check before `path.resolve()` prevents
traversal even on Windows-style paths. Checking after `resolve()` alone would be insufficient
if the path string itself contains social-engineering `..` patterns.
