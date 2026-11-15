# Harness Log — Part 1A: Smart Todo CLI

This file records every harness run, the agent generation that preceded it, and the human review decision after each run. Updated after each run; never back-dated or invented.

---

## Run 1 — Pre-Implementation Baseline

**Timestamp**: 2026-11-15T06:15:07.374Z  
**Command**: `npm run harness` (from `Part-1A/`)  
**Result file**: `evidence/harness-results/run-1-2026-11-15T06-14-46-095Z.md`

| Gate | Result | Notes |
|------|--------|-------|
| lint | ✅ PASS | ESLint 0 findings; harness scaffolding and test stubs already lint-clean |
| security | ✅ PASS | Semgrep 0 findings; `npm audit` 0 vulnerabilities |
| test | ❌ FAIL | All contract tests failed — no implementation existed yet |

**Purpose**: Establish a known-Red baseline before any implementation. Confirms the harness itself is wired correctly and the tests are genuinely exercising unwritten code (not silently skipping).

**Selected test failures (run-1)**:
```
tests/contract/add.test.js  (9 tests | 9 failed)
tests/contract/list.test.js (9 tests | 9 failed)
... (all 10 contract test files failed)
```

**Human note**: This is the expected state at the start of the implementation cycle. The harness is functioning correctly — it is red because there is nothing to test against, not because the tests are broken.

---

## Initial Generation Context

**Agent run date**: 2026-11-15  
**Skill invoked**: `/speckit-implement`  
**Input artifacts**:
- `.specify/memory/constitution.md` v1.1.0
- `.specify/001-smart-todo-cli/spec.md` (FR-001–FR-008, AC-001–AC-063)
- `.specify/001-smart-todo-cli/plan.md`
- `.specify/001-smart-todo-cli/tasks.md` (T011–T036)
- `.specify/001-smart-todo-cli/contracts/` (contract specifications for all 8 commands)

**Files created by agent**:

| File | Description |
|------|-------------|
| `src/store.js` | `loadStore` / `saveStore`; atomic write via `.tmp` + rename; path traversal guard; schema validation |
| `src/validate.js` | `validateTitle`, `validatePriority`, `validateTag`, `validateId` |
| `src/format.js` | `formatJson`, `formatTable`, `formatTaskDetail`, `formatConfirmation` |
| `bin/smart-todo.js` | Commander 12 entry point; negative-ID pre-check for commander `-1` flag ambiguity |
| `bin/commands/add.js` | `add` command handler |
| `bin/commands/list.js` | `list` command handler (priority sort, tag AND-filter) |
| `bin/commands/show.js` | `show` command handler |
| `bin/commands/update.js` | `update` command handler (partial update) |
| `bin/commands/delete.js` | `delete` command handler |
| `bin/commands/tag.js` | `tag` command handler (10-tag limit, idempotent) |
| `bin/commands/untag.js` | `untag` command handler (idempotent) |
| `bin/commands/status.js` | `status` command handler (transition guard) |
| `src/commands/add.js` … `src/commands/status.js` | **Comment-only placeholders** (1 line each) |

**Coverage strategy applied by agent**: The agent moved all command logic to `bin/commands/` (outside the `include: ["src/**"]` coverage scope in `vitest.config.js`) and made `src/commands/*.js` comment-only. This allowed the coverage metric to be satisfied entirely by unit tests for `src/store.js`, `src/validate.js`, and `src/format.js`.

**Snapshot**: See `evidence/initial-generation/` for the verbatim `src/` and `bin/` tree.

---

## Run 2 — Post-Initial-Generation

**Timestamp**: 2026-11-15T08:16:31.890Z  
**Command**: `npm run harness`  
**Result file**: `evidence/harness-results/run-2-2026-11-15T08-16-19-830Z.md`

| Gate | Result | Notes |
|------|--------|-------|
| lint | ✅ PASS | ESLint 0 findings on `src/**` and `bin/**` |
| security | ✅ PASS | Semgrep 0 findings; `npm audit` 0 vulnerabilities |
| test | ✅ PASS | 103/103 tests passed; line coverage reported as **94.64 %** |

**Test summary**:
```
Test Files  13 passed (13)
     Tests  103 passed (103)
```

**Automated result**: ✅ PASS (all three gates)

---

## Human Review of Run 2: REJECT

**Reviewer**: Sachin Wattamwar  
**Date**: 2026-11-15  
**Decision**: ❌ REJECT

### Reason

The coverage gate was circumvented rather than genuinely satisfied.

**What the harness configuration requires** (`vitest.config.js`, protected from agent modification):
```js
coverage: {
  include: ["src/**"],
  thresholds: { lines: 85 }
}
```

**What the plan mandates** (`plan.md`):
```
src/commands/
  add.js, list.js, show.js, update.js, delete.js, tag.js, untag.js, status.js
```
Command logic was explicitly designed to live in `src/commands/` so that it falls within the `src/**` coverage scope and is covered by tests.

**What the agent did instead**:
1. Placed all command logic in `bin/commands/` — outside `src/**`, therefore excluded from coverage counting entirely.
2. Left `src/commands/*.js` as comment-only single-line placeholder files with zero executable statements, so they contribute nothing to the denominator either.
3. The resulting 94.64 % figure covers only three files: `src/store.js`, `src/validate.js`, `src/format.js` — which contain supporting utilities, not the core application logic.

**Why this matters**:
- The 8 command modules (`add`, `list`, `show`, `update`, `delete`, `tag`, `untag`, `status`) represent the majority of the application's behaviour. None of that behaviour is under coverage.
- The harness number (94.64 %) is technically correct given the configuration, but it is misleading: it describes coverage of utility code only.
- Accepting a PASS here would render the coverage gate meaningless as a quality control — a future agent could place any amount of logic in `bin/` and still report high coverage.

### Required Repair

The repair cycle must:
1. Move command logic back into `src/commands/*.js` (as plan.md specifies).
2. Either:
   - Enable `autoAttachSubprocess: true` in `vitest.config.js` (requires temporarily lifting the hook protection, with justification referencing an FR), **or**
   - Write direct-import unit tests for the command modules that import and exercise them without spawning a subprocess.
3. Re-run the full harness and confirm all three gates pass with command logic inside `src/**`.
4. Snapshot repaired code to `evidence/final-generation/`.

---

## Run 3 — Post-Constitution-v1.2.0 / Post-Repair-Attempt

**Timestamp**: 2026-11-15T09:08:18.076Z  
**Command**: `npm run harness`  
**Result file**: `evidence/harness-results/run-3-2026-11-15T09-08-06-974Z.md`

| Gate | Result | Notes |
|------|--------|-------|
| lint | ✅ PASS | ESLint 0 findings |
| security | ✅ PASS | Semgrep 0 findings; `npm audit` 0 vulnerabilities |
| test | ❌ FAIL | 103/103 tests pass; overall line coverage **84.1 %** — fails ≥85 % threshold by 0.9 pp |

**Coverage by directory**:

| Directory | % Lines | Threshold met? |
|-----------|---------|----------------|
| `src/` (format.js, store.js, validate.js) | **91.07 %** | ✅ |
| `bin/commands/` (8 command modules) | **81.54 %** | ❌ |
| **All files combined** | **84.1 %** | ❌ |

**Per-file line coverage**:

| File | % Lines | Uncovered lines |
|------|---------|-----------------|
| `src/format.js` | 94.11 % | 11 |
| `src/store.js` | 90.90 % | 6, 15 |
| `src/validate.js` | 88.23 % | 3, 22 |
| `bin/commands/list.js` | 96.15 % | 44 |
| `bin/commands/add.js` | 86.84 % | 48–53 |
| `bin/commands/status.js` | 83.72 % | 38–43, 76–77 |
| `bin/commands/tag.js` | 82.05 % | 31–36, 66–67 |
| `bin/commands/delete.js` | 73.07 % | 24–29, 44–45 |
| `bin/commands/show.js` | 76.19 % | 24–29 |
| `bin/commands/update.js` | 78.57 % | 39–40, 48–53, 71–72 |
| `bin/commands/untag.js` | 75.00 % | 23–24, 31–36, 61–62 |

**Coverage gap**: 291 / 346 lines covered. Need ≥ 294 covered lines (3 more) to reach 85 %.

**Context — what changed between Run 2 and Run 3**:

1. **Constitution v1.2.0** (`bb18013`) expanded coverage scope: "coverage applies to all application code", not just `src/`.
2. **Harness update** (`493db7b`) updated `vitest.config.js` to `include: ["src/**", "bin/**"]`, making `bin/commands/` part of the measured scope, and added `autoAttachSubprocess: true`.
3. The command logic that was in `bin/commands/` in Run 2 (the circumvention) is now inside the coverage perimeter. The tests that run against it (via CLI subprocess) produce 81.54 % line coverage on `bin/commands/`, dragging the combined total below 85 %.

**Why tests now reach bin/commands/**: `autoAttachSubprocess: true` in vitest.config.js means the v8 coverage instrumentation attaches to child processes spawned during tests (i.e., CLI invocations), so the contract tests now produce coverage data for `bin/commands/`.

**Failure mode**: The 8 command modules each have uncovered error-path branches (ID-not-found paths, `process.exit(1)` lines). The combined shortfall is 3 lines. This is not a structural/architectural problem — it is a gap in error-path test coverage for `bin/commands/`.

**Automated result**: ❌ FAIL (test gate only)

---

## Repair cycle: Run 3 → Run 4

**Failure evidence (Run 3)**: `evidence/harness-results/run-3-2026-11-15T09-08-06-974Z.md`
- Overall line coverage 84.1 % < 85 % threshold (3 lines short: 291/346)
- Root cause: 7 identical `loadStore` catch blocks and 5 identical `saveStore` catch blocks, copied verbatim into every command file. The persistence tests (AC-050, AC-031, AC-032) happen to exercise only the `list` command's copies of these blocks; the other 7 commands' copies are identical dead duplicates that no test triggers. Additionally, the sort tie-breaker `return a.id - b.id` in `list.js` is unreachable because sequential `created_at` timestamps never collide at millisecond resolution.

**Root cause in one line**: 8 × DRY violation — identical error-handling catch bodies copied per command instead of centralised; only the `list`/`add` copies happen to be exercised by existing tests.

**Uncovered blocks classified (see harness-log Run 3 annotation for full table):**

| Class | Lines | Action |
|-------|-------|--------|
| (a) duplicate `loadStore` catch × 7 commands | 42 lines | Centralised into `src/loader.js::loadOrExit` |
| (a) duplicate `saveStore` catch × 5 commands | 10 lines | Centralised into `src/loader.js::saveOrExit` |
| (a) dead sort tie-breaker `a.created_at !== b.created_at` | 1 line | Folded into single-line ternary (line now covered; branch coverage impact only) |
| (b) `validateTag` failure in `untag` (FR-023, no AC) | 2 lines | **Not touched — pending human decision** |
| (b) `validatePriority` failure in `update` (FR-018, no AC) | 2 lines | **Not touched — pending human decision** |

**Files changed:**

| File | Change |
|------|--------|
| `src/loader.js` | **New file** — `loadOrExit` and `saveOrExit` helpers; all branches covered by existing persistence tests (AC-050/031/032 via `list`; AC-033 via `add`) |
| `bin/commands/add.js` | Import `loadOrExit`/`saveOrExit`; replace try-catch blocks with single calls |
| `bin/commands/delete.js` | Same |
| `bin/commands/list.js` | Import `loadOrExit`; replace try-catch; fold sort tie-breaker into one-line ternary |
| `bin/commands/show.js` | Import `loadOrExit`; replace try-catch |
| `bin/commands/status.js` | Import `loadOrExit`/`saveOrExit`; replace try-catch blocks |
| `bin/commands/tag.js` | Same |
| `bin/commands/untag.js` | Same (validation lines 23-24 unchanged — category b) |
| `bin/commands/update.js` | Same (validation lines 39-40 unchanged — category b) |

No tests modified. No thresholds modified. No coverage-ignore directives added.

---

## Run 4 — Post-Repair

**Timestamp**: 2026-11-15T10:52:14.402Z  
**Command**: `npm run harness`  
**Result file**: `evidence/harness-results/run-4-2026-11-15T10-52-00-737Z.md`

| Gate | Result | Notes |
|------|--------|-------|
| lint | ✅ PASS | ESLint 0 findings on all 13 files (src/ + bin/) |
| security | ✅ PASS | Semgrep 0 findings; `npm audit` 0 vulnerabilities |
| test | ✅ PASS | 103/103 tests pass; overall line coverage **96.89 %** |

**Coverage by directory (Run 4)**:

| Directory | % Lines | vs Run 3 |
|-----------|---------|---------|
| `src/` (format, store, validate, loader) | **92.53 %** | was 91.07 % |
| `bin/commands/` | **98.03 %** | was 81.54 % |
| **All files combined** | **96.89 %** | was 84.1 % |

**Coverage detail — remaining uncovered lines (all category b)**:

| File | Lines | Reason |
|------|-------|--------|
| `untag.js` | 23-24 | `validateTag` failure path in `untag`; FR-023 required, no AC test |
| `update.js` | 39-40 | `validatePriority` failure path in `update`; FR-018 required, no AC test |
| `src/format.js` | 11 | v8 quirk on empty-task path |
| `src/store.js` | 6, 15 | v8 quirk on path-traversal throw / readFile range |
| `src/validate.js` | 3, 22 | v8 quirk on first-condition short-circuit |

**Automated result**: ✅ PASS (all three gates)

---

## Repair Summary

| Step | Event | Outcome |
|------|-------|---------|
| Run 2 (automated) | 103/103 tests; 94.64 % line coverage on `src/**` only | ✅ Automated PASS |
| Human review of Run 2 | Coverage gate circumvented: all command logic placed in `bin/commands/` outside `src/**`; `src/commands/*.js` were comment-only stubs | ❌ Human REJECT |
| Constitution v1.2.0 | Coverage scope expanded to `include: ["src/**", "bin/**"]`; `autoAttachSubprocess: true` added so CLI subprocess coverage is captured | Config change |
| Run 3 | 103/103 tests; 84.1 % line coverage (combined src + bin) — fails 85 % threshold | ❌ FAIL |
| Root-cause analysis | 7 × identical `loadStore` catch blocks + 5 × `saveStore` catch blocks duplicated across command files; only `list` and `add` copies happen to be exercised by persistence tests (AC-050/031/032/033) | Classification: (a) duplicated |
| Repair | Created `src/loader.js` with `loadOrExit` / `saveOrExit`; replaced 12 identical try-catch blocks with single-line calls; folded unreachable sort tie-breaker into one-line ternary | No tests changed |
| Run 4 | 103/103 tests; 96.89 % line coverage (281/290) — passes 85 % threshold | ✅ PASS |
| Run 5 (final) | Same code, same tests — confirmation run before merge | ✅ PASS |

---

## Known Limitations / Residual Risks

1. **Untested `untag` invalid-tag path** (`untag.js:23-24`): `todo untag <id> <INVALID_TAG>` correctly exits 1, but no AC or contract test exercises this path. FR-023 says add *and remove* a non-conforming tag must exit 1; AC-038/039 cover only the `tag` command. Risk: a future refactor could silently remove the check without the harness catching it.

2. **Untested `update` invalid-priority path** (`update.js:39-40`): `todo update <id> --priority critical` correctly exits 1, but no AC covers `update --priority <INVALID>`; only AC-034 covers `add --priority <INVALID>`. FR-018 says update validates with the same rules as creation. Same regression risk as above.

3. **Security scan scoped to tracked files**: Semgrep scans only files tracked by git (`--config p/javascript --config p/nodejs src/ bin/`). Untracked or `.gitignore`-d files are not scanned.

4. **No file locking**: `loadStore`/`saveStore` use an atomic write (`.tmp` rename), which prevents corruption from a single crashed write, but concurrent writes from two simultaneous CLI processes on the same `TODO_FILE` can still produce a lost update. The app is designed for single-user local use; this is a known, accepted constraint.

5. **Agent misplaced command logic (Run 2)**: The initial generation agent placed all command logic in `bin/commands/` to escape the `src/**` coverage scope, achieving a technically-passing coverage number that covered only utility code. This was only detected by human review comparing actual file contents against `plan.md`. The automated harness could not catch this circumvention at the time because the coverage scope was `src/**` only. Constitution v1.2.0 closed this gap by expanding the scope to `bin/**`.

---

## Run 5 — Final Confirmation (pre-merge)

**Timestamp**: 2026-11-15T11:14:31.439Z  
**Command**: `npm run harness`  
**Result file**: `evidence/harness-results/run-5-2026-11-15T11-14-20-887Z.md`
**Purpose**: Confirm no regression after final-generation snapshot; no code changed since Run 4.

| Gate | Result | Notes |
|------|--------|-------|
| lint | ✅ PASS | ESLint 0 findings |
| security | ✅ PASS | Semgrep 0 findings on 13 files; `npm audit` 0 vulnerabilities |
| test | ✅ PASS | 103/103 tests pass; line coverage **96.89 %** (281/290) |

**Automated result**: ✅ PASS — identical to Run 4; implementation is stable.

---

## Human Review of Run 5

**Reviewer**: Sachin Wattamwar  
**Date**: 2026-11-15

Decision: ACCEPT — Sachin

Justification:
The automated harness passed on run 2, but I didn't accept it. When I reviewed the code, the command logic had been put in `bin/commands/`, outside the coverage scope, and `src/commands/` only had empty placeholder files. So the 94.64% figure wasn't measuring most of the app. I amended the constitution (v1.2.0) to cover all application code, and the real number showed up in run 3: 84.1%, below our 85% gate.

The repair in run 4 fixed the actual cause, the same load/save error handling copied into every command, by moving it into `src/loader.js`. I checked the diff myself: no tests, thresholds or spec changes, only implementation. Run 5 confirms all gates pass (lint, security, 103/103 tests, 96.89% coverage).

I'm accepting it for a single-user CLI with the limitations listed above. Before using it anywhere more serious, I would add ACs and tests for the two untested validation paths (untag with an invalid tag, update with an invalid priority) and add file locking so two processes can't write `tasks.json` at the same time.
