# Implementation Plan: Smart Todo CLI

**Branch**: `001-smart-todo-cli` | **Date**: 2026-11-14 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-smart-todo-cli/spec.md`

## Summary

A Node.js 22+ CLI tool (`todo`) that lets a single developer manage tasks from the terminal.
Tasks are persisted in a local JSON file (`{ "nextId", "tasks" }`) with atomic writes. Commands
cover the full CRUD lifecycle plus tag management and status transitions. The implementation uses
ES modules, commander, and plain JavaScript throughout. Quality gates — ESLint, Semgrep,
eslint-plugin-security, npm audit, and Vitest with ≥85% line coverage — are enforced by an
independent harness runner that writes timestamped evidence artefacts.

## Technical Context

**Language/Version**: Node.js 22+, ES modules (`"type": "module"` in package.json), plain
JavaScript (no TypeScript).

**Primary Dependencies**:
- `commander` — CLI argument parsing, sub-commands, `--json` flag
- `vitest` + `@vitest/coverage-v8` — test runner and V8 coverage provider
- `eslint` (flat config, `eslint.config.js`) + `eslint-plugin-security` — static analysis
- `semgrep` — additional SAST via `p/javascript` + `p/nodejs` rulesets
- `npm audit` — dependency vulnerability scanning

**Storage**: Local JSON file. Default path `./tasks.json`, overridable via `TODO_FILE` env var.
Store structure: `{ "nextId": <int>, "tasks": <Task[]> }`. All writes use atomic
write-then-rename (`node:fs/promises`).

**Testing**: Vitest with two suites:
- `tests/unit/` — isolated unit tests for store, validation, formatting modules
- `tests/contract/` — black-box CLI tests that spawn `bin/smart-todo.js` via
  `node:child_process execFile` (no `shell: true`); each test file references the AC IDs
  it covers

**Target Platform**: macOS / Linux, Node.js 22+ LTS. Single-developer local CLI — no
network, no containerisation requirement.

**Performance Goals**: Each command completes in < 500 ms on a machine with an idle disk
(SC-001 target of 10 s for a full add/status/tag/delete sequence is generous).

**Constraints**:
- No `eval()`, `new Function()`, dynamic `require()` from user input
- No `child_process` with `shell: true` (harness uses `execFile` without shell)
- No outbound network access
- `TODO_FILE` validated: `..` segments → exit 1; resolved to absolute path before I/O
- `eslint-disable` / `nosemgrep` suppressions require a written justification comment

**Scale/Scope**: Single developer, personal task list; JSON file growth is not a scalability
concern at this scope.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Gate | Design status |
|---|---|---|
| I. Code Quality & Static Analysis | ESLint 0 errors; Semgrep p/javascript + p/nodejs 0 ERR/WARN; eslint-plugin-security 0 ERR/WARN; npm audit 0 high/critical | ✅ All gates wired into `.harness/run-harness.js` in order lint → security → test |
| II. Test Quality & Coverage | Vitest 100% mandatory tests pass; line coverage src/ ≥ 85% | ✅ `@vitest/coverage-v8` with `thresholds.lines: 85` enforced; CI fails below threshold |
| III. Requirement Traceability | Every FR has ≥ 1 AC; every test references its AC ID | ✅ 57 ACs covering all 44 FRs; contract tests named and annotated with AC IDs |
| IV. Persistence & Reliability | Local JSON only; atomic writes; corrupt/missing handled with exit 3 | ✅ `store.js` uses temp-file + `fs.rename`; schema validation on every read |
| V. Security Constraints | No network, no secrets, no eval, no shell:true, no path traversal | ✅ No network calls; path validated in `store.js`; `execFile` without shell everywhere |
| Agent Rules | Never weaken ACs, skip tests, lower thresholds, suppress lint/security without justification | ✅ Acknowledged; enforced by harness independence |
| Harness Independence | Tests derived from spec ACs, not from implementation internals | ✅ Contract tests spawn the binary as a black box; no imports of internal modules |

No violations — Complexity Tracking section omitted.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-todo-cli/
├── plan.md              ← this file
├── research.md          ← Phase 0: all decisions recorded
├── data-model.md        ← Phase 1: entity schema + validation rules
├── quickstart.md        ← Phase 1: validation/run guide
├── contracts/
│   └── cli-schema.md    ← Phase 1: command-by-command CLI contract
└── tasks.md             ← Phase 2 output (/speckit-tasks)
```

### Source Code (repository root)

```text
bin/
└── smart-todo.js        # CLI entry point; #!/usr/bin/env node shebang; wires commander

src/
├── store.js             # load/save task store; atomic write; path validation; schema check
├── validate.js          # all input validation functions (title, priority, tags, ID, path)
├── format.js            # human-readable table renderer + JSON output helper
└── commands/
    ├── add.js           # FR-001–FR-008, FR-034, FR-038
    ├── list.js          # FR-009–FR-012
    ├── show.js          # FR-013, FR-014
    ├── update.js        # FR-015–FR-018a
    ├── delete.js        # FR-019, FR-019a, FR-020
    ├── tag.js           # FR-021, FR-023–FR-026
    ├── untag.js         # FR-022–FR-023, FR-025a, FR-026
    └── status.js        # FR-027–FR-030

tests/
├── unit/
│   ├── store.test.js    # store load/save, atomic write, schema validation, path validation
│   ├── validate.test.js # all validation rules (title, priority, tags, ID format)
│   └── format.test.js   # table output, JSON field names, snake_case keys
└── contract/
    ├── add.test.js      # AC-001, AC-004, AC-005, AC-006, AC-030, AC-034, AC-040, AC-041
    ├── list.test.js     # AC-002, AC-003, AC-016, AC-017, AC-028, AC-045
    ├── show.test.js     # AC-021, AC-022, AC-029, AC-052
    ├── update.test.js   # AC-023, AC-024, AC-025, AC-047, AC-051, AC-053
    ├── delete.test.js   # AC-026, AC-027, AC-048
    ├── tag.test.js      # AC-014, AC-018, AC-019, AC-020, AC-038, AC-039, AC-043, AC-055
    ├── untag.test.js    # AC-015, AC-044, AC-046, AC-055
    ├── status.test.js   # AC-007–AC-013, AC-035, AC-042, AC-049
    ├── persistence.test.js  # AC-031, AC-032, AC-033, AC-050, AC-054, AC-056, AC-057
    └── ids.test.js      # AC-036, AC-037, AC-053 (ID format + never-reuse)

.harness/
├── run-harness.js       # gate runner: lint → security → test+coverage → write evidence
└── semgrep.yml          # optional local semgrep config overrides

evidence/
└── harness-results/     # timestamped JSON + summary files written by run-harness.js
    └── .gitkeep

package.json             # "type":"module"; scripts: lint, security, test, harness
eslint.config.js         # flat config; @eslint/js + eslint-plugin-security
vitest.config.js         # coverage: v8, include: src/**, thresholds.lines: 85
```

**Structure Decision**: Single-project layout (Option 1). Source split into `store`, `validate`,
`format`, and per-command modules so unit tests can cover each in isolation and contract tests
remain black-box at the CLI boundary. The harness and evidence directories are siblings of `src`
to keep them independent of the application code.
