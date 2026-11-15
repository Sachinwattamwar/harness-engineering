# Tasks: Smart Todo CLI

**Input**: Design documents from `specs/001-smart-todo-cli/`

**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/cli-schema.md ✅

**Ordering rule (user-specified)**: Harness infrastructure and spec-derived test tasks come FIRST
within every phase; implementation tasks follow. Every test task is tagged with the AC IDs it
covers. Every implementation task lists the FR and AC IDs it satisfies.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelizable — targets a distinct file, no incomplete-task dependencies
- **[US#]**: User story this task belongs to (US1–US7 from spec.md)
- Foundational and Setup phases carry no story label

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Scaffold the project — directories, package manifest, tooling configs.
No user story work begins until this phase is complete.

- [X] T001 Create full directory tree: `bin/`, `src/`, `src/commands/`, `tests/unit/`, `tests/contract/`, `.harness/`, `evidence/harness-results/`
- [X] T002 Create `package.json` with `"type":"module"`, `"name":"smart-todo"`, `"bin":{"todo":"./bin/smart-todo.js"}`, scripts `lint / security / test / harness`, and all runtime + dev dependencies: `commander`; `vitest @vitest/coverage-v8`; `eslint @eslint/js eslint-plugin-security`
- [X] T003 [P] Create `eslint.config.js` (flat config): import `@eslint/js` and `eslint-plugin-security`; export `[js.configs.recommended, security.configs.recommended]` with no disabled rules
- [X] T004 [P] Create `vitest.config.js`: coverage provider `v8`; `include: ["src/**"]`; `thresholds: { lines: 85 }`; `reporter: ["text","lcov"]`
- [X] T005 [P] Create `.gitignore` (entries: `node_modules/`, `coverage/`, `evidence/harness-results/*.json`, `evidence/harness-results/*.txt`, `*.tmp`) and `evidence/harness-results/.gitkeep`

**Checkpoint**: Project skeleton in place — tooling can be installed with `npm install`.

---

## Phase 2: Foundational (Harness + Core Modules)

**Purpose**: The independent harness runner, shared test helpers, and the three core modules
(`store`, `validate`, `format`) that every command depends on. All user story work is blocked
on this phase.

**⚠️ CRITICAL**: Tests are written FIRST and MUST FAIL before their corresponding implementation is started.

### Harness Infrastructure

- [X] T006 Create `.harness/run-harness.js` — ES module script using `node:child_process execFile` and `node:fs/promises`; runs gates sequentially: (1) `npm run lint`, (2) `npm run security`, (3) `npm run test`; collects `{gate, exitCode, stdout, stderr, passed}` for each; writes `evidence/harness-results/<ISO-timestamp>.json` (full gate results) and `evidence/harness-results/<ISO-timestamp>.txt` (human-readable summary: gate name, PASS/FAIL, first 10 lines of output); exits `process.exit(1)` if any gate failed, `process.exit(0)` if all passed; `npm run security` script must invoke `semgrep --config p/javascript --config p/nodejs src/ bin/` then `npm audit --audit-level=high`

### Shared Test Helper

- [X] T007 [P] Create `tests/contract/helpers.js` — exports `runCli(args, env={})`: uses `node:child_process execFile` to spawn `node bin/smart-todo.js` with the given args array and `TODO_FILE` set to a unique temp path (`os.tmpdir()/<uuid>.json`); returns `Promise<{stdout, stderr, exitCode}>`; `shell` option MUST be `false`; exports `removeTempFile(path)` for cleanup

### Tests for Core Modules (WRITE FIRST — must fail before T011–T013)

- [X] T008 [P] Create `tests/unit/store.test.js` — covers: `loadStore` on missing file returns `{nextId:1, tasks:[]}`; `loadStore` on corrupt JSON throws with message containing file path and `"parse"`/`"invalid JSON"` (AC-031); `loadStore` on wrong schema (bare array) throws with message containing file path and `"schema"` (AC-032); `saveStore` writes `{ nextId, tasks }` atomically and no `.tmp` file remains (AC-056); path containing `..` throws with message containing `".."` or `"invalid"` and code mapped to exit 1 (AC-050); `nextId` advances monotonically and is never reset by delete (AC-057 store side)
- [X] T009 [P] Create `tests/unit/validate.test.js` — covers: `validateTitle("")` → invalid, error contains `"120"` and `"character"` (AC-005); `validateTitle("a".repeat(121))` → invalid (AC-005); `validateTitle("a".repeat(120))` → valid (AC-004); `validatePriority("critical")` → invalid, error contains `"priority"` and `"low"` `"medium"` `"high"` (AC-034); `validateTag("WORK")` → invalid, error contains `"lowercase"` (AC-019, AC-041); `validateTag("")` → invalid, error contains `"tag"` (AC-039); `validateTag("my tag")` → invalid (AC-038); `validateTag("valid-tag-123")` → valid; `validateId("abc")` → invalid, error contains `"id"` or `"integer"` (AC-036); `validateId("-1")` → invalid, error contains `"id"` or `"positive"` (AC-037); `validateId("0")` → invalid; `validateId("1")` → valid
- [X] T010 [P] Create `tests/unit/format.test.js` — covers: `formatJson(task)` returns string parseable by `JSON.parse`; parsed object has exactly the keys `id, title, description, priority, tags, status, created_at, updated_at` (snake_case — AC-028, AC-029); `formatJson([task])` returns JSON array; `formatTable([task])` returns a string containing the task title; `formatConfirmation("Task 1 created.")` returns that string

### Core Module Implementation

- [X] T011 Create `src/store.js` — exports `loadStore(filePath)` and `saveStore(filePath, store)`; `loadStore`: (a) check `filePath` for `..` path segments via `filePath.split(path.sep).includes("..")` — throw `{code:"VALIDATION_ERROR", message: ".. or invalid"}` if found; (b) `path.resolve(filePath)` to absolute; (c) `fs.readFile` — if `ENOENT` return `{nextId:1, tasks:[]}`; (d) `JSON.parse` — if SyntaxError throw `{code:"STORAGE_ERROR", message: "<path>: parse error / invalid JSON"}`; (e) validate top-level shape `{nextId: integer ≥ 1, tasks: array}` — if invalid throw `{code:"STORAGE_ERROR", message: "<path>: schema mismatch"}`; `saveStore`: write `JSON.stringify(store, null, 2)` to `<resolvedPath>.tmp` then `fs.rename(tmp, resolved)`; throw `{code:"STORAGE_ERROR", message: "<path>: ..."}` on I/O failure
- [X] T012 [P] Create `src/validate.js` — exports: `validateTitle(s)`: valid if `s.length >= 1 && s.length <= 120`, else `{valid:false, error:"title must be between 1 and 120 characters"}`; `validatePriority(s)`: valid if in `["low","medium","high"]`, else `{valid:false, error:"priority must be low, medium, or high"}`; `validateTag(s)`: valid if `/^[a-z0-9-]+$/.test(s)`, else `{valid:false, error:"tags must be lowercase letters, digits, or hyphens only"}` (empty string also fails: `"tag value must not be empty"`); `validateId(s)`: `parseInt(s,10)` — if `isNaN` → `{valid:false, error:"id must be an integer"}`, if `<= 0` → `{valid:false, error:"id must be a positive integer"}`; all pass cases return `{valid:true}`
- [X] T013 [P] Create `src/format.js` — exports: `formatJson(data)`: `JSON.stringify(data, null, 2)`; `formatTable(tasks)`: renders a padEnd-based table with columns `ID | Title | Priority | Status | Tags | Updated`; `formatTaskDetail(task)`: renders all 8 fields (`id, title, description, priority, tags, status, created_at, updated_at`) as a two-column table; `formatConfirmation(msg)`: returns `msg` as-is; all JSON output keys MUST be snake_case matching the Task entity definition
- [X] T014 Create `bin/smart-todo.js` — `#!/usr/bin/env node` shebang; `"use strict"` / ESM; creates `commander` `Command` with `.name("todo").version("1.0.0")`; registers global `--json` option; dynamically imports and registers 8 sub-commands: `add list show update delete tag untag status` from `src/commands/`; wraps commander errors to write to stderr and call `process.exit(1)`; wraps storage errors to write to stderr and call `process.exit(3)`; wraps not-found errors to call `process.exit(2)`

**Checkpoint**: `npm run lint` passes; `npm run test` runs (and unit tests fail until T011–T013 are implemented); harness runner produces evidence files.

---

## Phase 3: User Story 1 — Create and List Tasks (Priority: P1) 🎯 MVP

**Goal**: Developer can add tasks (with title, description, priority, tags) and list them sorted
by priority; both default table and `--json` output work.

**Independent Test**: `node bin/smart-todo.js add --title "X"` succeeds; `node bin/smart-todo.js list` shows the task. No other commands required.

### Tests First — US1 (must fail before T017–T018)

- [X] T015 [P] [US1] Create `tests/contract/add.test.js` — using helpers.js; covers: AC-001 (add with `--title "Write tests"` → stdout contains `"Task 1 created."`, exit 0, tasks.json created); AC-004 (title 120 chars → exit 0); AC-005 (title 121 chars → exit 1, stderr contains `"120"` and `"character"`); AC-006 (`--title` omitted → exit 1, stderr contains `"--title"` and `"required"`); AC-030 (`add --json` → stdout is valid JSON with keys `id,title,description,priority,tags,status,created_at,updated_at`); AC-034 (`--priority critical` → exit 1, stderr contains `"priority"` and `"low"`,`"medium"`,`"high"`); AC-040 (11 `--tag` values → exit 1, stderr contains `"10"` and `"tag"`); AC-041 (`--tag WORK` → exit 1, stderr contains `"lowercase"`); AC-062 (exactly 10 distinct `--tag` values → task created with all 10 tags, exit 0)
- [X] T016 [P] [US1] Create `tests/contract/list.test.js` — covers: AC-002 (tasks with high/medium/low priorities → list output order: high first, medium second, low third, exit 0); AC-003 (empty store → non-error empty message, exit 0); AC-016 (task 1 tags `work urgent`, task 2 tag `work` → `list --tag work --tag urgent` returns only task 1, exit 0); AC-017 (`list --tag nonexistent` → empty list, exit 0); AC-028 (`list --json` → valid JSON array with snake_case keys); AC-045 (two tasks same priority and same `created_at` → ordered by `id` ascending); AC-061 (empty store + `--json` → stdout `[]`, exit 0)

### Implementation — US1

- [X] T017 [US1] Create `src/commands/add.js` — parses `--title` (required, FR-001), `--description` (FR-002), `--priority` default `"medium"` (FR-003), `--tag` (repeatable, FR-004); validates title via `validateTitle` (FR-008): exit 1, stderr contains `"120"` and `"character"`; validates priority via `validatePriority` (FR-003): exit 1, stderr contains `"priority"` and valid values; validates each tag via `validateTag` (FR-023); deduplicates tags silently (FR-025b); rejects > 10 unique tags (FR-024); assigns `nextId` and increments counter (FR-005); sets `status:"todo"` (FR-006); sets `created_at = updated_at = new Date().toISOString()` (FR-007); saves store atomically (FR-034, FR-037); on `--json`: prints `formatJson(task)` to stdout (FR-032, FR-032a, FR-032b); else: prints `Task <id> created.` (FR-031); exits 0 (FR-040), 1 (FR-041), 3 (FR-043); satisfies AC-001, AC-004, AC-005, AC-006, AC-030, AC-034, AC-040, AC-041
- [X] T018 [US1] Create `src/commands/list.js` — loads store (FR-009); applies `--tag` AND-filter: keep only tasks where `task.tags` contains ALL specified tag values (FR-011, FR-012); if no match: print empty-list message, exit 0; sorts by priority descending (`high=3, medium=2, low=1`) then `created_at` ascending then `id` ascending (FR-010); on `--json`: prints `formatJson(tasks)` array (FR-032, FR-032a); else: prints `formatTable(tasks)` (FR-031); exits 0 (FR-040), 3 (FR-043); satisfies AC-002, AC-003, AC-016, AC-017, AC-028, AC-045

**Checkpoint**: `todo add --title "Test"` and `todo list` work end-to-end. US1 contract tests pass.

---

## Phase 4: User Story 2 — Manage Task Status Workflow (Priority: P2)

**Goal**: Developer can move tasks through `todo → in_progress → done` and back; invalid
transitions are rejected with the specific error text the spec requires.

**Independent Test**: Create a task, run `todo status 1 in_progress` → confirmation; `todo show 1` shows `in_progress`.

### Tests First — US2 (must fail before T020)

- [X] T019 [US2] Create `tests/contract/status.test.js` — covers: AC-007 (`todo→in_progress` → confirmation, exit 0); AC-008 (`in_progress→done` → confirmation, exit 0); AC-009 (`in_progress→todo` → confirmation, exit 0); AC-010 (`todo→done` → exit 1, stderr contains `"invalid transition"`, `"todo"`, `"done"`); AC-011 (`done→todo` → exit 1, stderr contains `"invalid transition"`, `"done"`, `"todo"`); AC-012 (`done→in_progress` → exit 1, stderr contains `"invalid transition"`, `"done"`, `"in_progress"`); AC-013 (`status 99 done` → exit 2, stderr contains `"99"` and `"not found"`); AC-035 (`status 1 archived` → exit 1, stderr contains `"status"` and `"todo"`,`"in_progress"`,`"done"`); AC-042 (`status 1 in_progress --json` → valid JSON object with updated `status` field, snake_case keys); AC-049 (same-status no-op → confirmation, exit 0); AC-060 (same-status no-op + `--json` → valid JSON object, unchanged task, exit 0)

### Implementation — US2

- [X] T020 [US2] Create `src/commands/status.js` — validates `<id>` via `validateId` (FR-044): exit 1, stderr contains `"id"`/`"integer"`/`"positive"`; validates `<new-status>` is one of `["todo","in_progress","done"]` (FR-027): exit 1, stderr contains `"status"` and all valid values; loads store (FR-042): exit 2, stderr contains id and `"not found"` if task absent; if `newStatus === task.status`: no-op confirmation, exit 0 (FR-030); checks allowed transitions `{todo:["in_progress"], in_progress:["done","todo"], done:[]}` (FR-028); if forbidden: exit 1, stderr contains `"invalid transition"`, current status, requested status (FR-029); updates `status` and `updated_at`; saves store (FR-037); on `--json`: `formatJson(task)` (FR-032, FR-032a, FR-032b); else: one-line confirmation (FR-031); exits 0 (FR-040), 1 (FR-041), 2 (FR-042), 3 (FR-043); satisfies AC-007–AC-013, AC-035, AC-042, AC-049

**Checkpoint**: Full status workflow functional. US2 contract tests pass.

---

## Phase 5: User Story 3 — Organise and Filter with Tags (Priority: P3)

**Goal**: Developer can add and remove tags on existing tasks; `list --tag` filters by AND semantics.

**Independent Test**: `todo tag 1 work` adds tag; `todo untag 1 work` removes it; `todo list --tag work` returns only tagged tasks.

### Tests First — US3 (must fail before T023–T024)

- [X] T021 [P] [US3] Create `tests/contract/tag.test.js` — covers: AC-014 (`tag 1 work` → confirmation, exit 0, task has tag `"work"`); AC-018 (task has 10 tags → `tag 1 eleventh` → exit 1, stderr contains `"10"` and `"tag"`); AC-019 (`tag 1 WORK` → exit 1, stderr contains `"lowercase"`); AC-020 (duplicate tag → no-op confirmation, exit 0); AC-038 (`tag 1 "my tag"` → exit 1, stderr contains `"lowercase"` or char-set description); AC-039 (`tag 1 ""` → exit 1, stderr contains `"tag"` and invalidity indicator); AC-043 (`tag 1 work --json` → valid JSON object with `"work"` in `tags` array, snake_case keys); AC-055 (`tag 99 work` → exit 2, stderr contains `"99"` and `"not found"`); AC-058 (duplicate tag + `--json` → valid JSON object with tag present exactly once, exit 0)
- [X] T022 [P] [US3] Create `tests/contract/untag.test.js` — covers: AC-015 (`untag 1 work` → confirmation, exit 0, tag absent); AC-044 (`untag 1 work --json` → valid JSON object with `"work"` absent from `tags` array, snake_case keys); AC-046 (`untag 1 missing` where tag not on task → no-op confirmation, exit 0); AC-055 (`untag 99 work` → exit 2, stderr contains `"99"` and `"not found"`); AC-059 (untag no-op + `--json` → valid JSON object, tag absent, exit 0)

### Implementation — US3

- [X] T023 [US3] Create `src/commands/tag.js` — validates `<id>` (FR-044); validates `<tag>` via `validateTag` (FR-023): exit 1, stderr contains `"lowercase"` or emptiness indicator; loads store (FR-026): exit 2, stderr contains id and `"not found"`; if tag already present: no-op confirmation, exit 0 (FR-025); if `task.tags.length >= 10`: exit 1, stderr contains `"10"` and `"tag"` (FR-024); push tag, update `updated_at`, save store (FR-037); on `--json`: `formatJson(task)` (FR-032, FR-032a, FR-032b); else: one-line confirmation (FR-031); satisfies AC-014, AC-018, AC-019, AC-020, AC-038, AC-039, AC-043, AC-055
- [X] T024 [US3] Create `src/commands/untag.js` — validates `<id>` (FR-044); validates `<tag>` via `validateTag` (FR-023); loads store (FR-026): exit 2 on not found; if tag absent: no-op confirmation, exit 0 (FR-025a); remove tag, update `updated_at`, save store (FR-037); on `--json`: `formatJson(task)` (FR-032, FR-032a, FR-032b); else: one-line confirmation (FR-031); satisfies AC-015, AC-044, AC-046, AC-055

**Checkpoint**: Tag operations work. `list --tag` AND-filter works (since T018 already implements the filter logic, it now produces results for tasks tagged via the `tag` command).

---

## Phase 6: User Story 4 — Inspect and Update Individual Tasks (Priority: P4)

**Goal**: Developer can view the full detail of one task and update any of its fields.

**Independent Test**: `todo show 1` displays all 8 fields; `todo update 1 --title "New"` changes the title and refreshes `updated_at`.

### Tests First — US4 (must fail before T027–T028)

- [X] T025 [P] [US4] Create `tests/contract/show.test.js` — covers: AC-021 (`show 1` → table containing all 8 fields: `id, title, description, priority, tags, status, created_at, updated_at`, exit 0); AC-022 (`show 99` → exit 2, stderr contains `"99"` and `"not found"`); AC-029 (`show 1 --json` → valid JSON object with all 8 snake_case keys); AC-052 (task created with `--description "Push to prod"` → `show` output contains `"Push to prod"`)
- [X] T026 [P] [US4] Create `tests/contract/update.test.js` — covers: AC-023 (`update 1 --title "Revised"` → confirmation, exit 0, `updated_at` changed); AC-024 (`update 1 --priority high` → confirmation, exit 0); AC-025 (`update 1 --title ""` → exit 1, stderr contains `"title"` and `"120"` or `"1 and 120"`); AC-047 (`update 1` with no flags → exit 1, stderr contains `"at least one"` or `"--title"`); AC-051 (`update 1 --title "X" --json` → valid JSON object, snake_case keys, updated title); AC-053 (`update 99 --title "X"` → exit 2, stderr contains `"99"` and `"not found"`); AC-063 (`update 1 --description "" --json` → valid JSON object with `"description": ""`, `updated_at` refreshed, exit 0)

### Implementation — US4

- [X] T027 [US4] Create `src/commands/show.js` — validates `<id>` (FR-044); loads store (FR-014): exit 2, stderr contains id and `"not found"`; on `--json`: `formatJson(task)` (FR-032, FR-032a); else: `formatTaskDetail(task)` table with all 8 fields (FR-013, FR-031); exits 0 (FR-040), 2 (FR-042), 3 (FR-043); satisfies AC-021, AC-022, AC-029, AC-052
- [X] T028 [US4] Create `src/commands/update.js` — validates `<id>` (FR-044); loads store (FR-017): exit 2, stderr contains id and `"not found"`; rejects if none of `--title, --description, --priority` supplied (FR-018a): exit 1, stderr contains `"at least one"` or `"--title"`; validates `--title` via `validateTitle` (FR-018, FR-008): exit 1; validates `--priority` via `validatePriority` (FR-003); applies each supplied option (FR-015); refreshes `updated_at` (FR-016); saves store (FR-037); on `--json`: `formatJson(task)` (FR-032, FR-032a, FR-032b); else: one-line confirmation (FR-031); satisfies AC-023, AC-024, AC-025, AC-047, AC-051, AC-053

**Checkpoint**: Full inspect + update workflow functional. US4 contract tests pass.

---

## Phase 7: User Story 5 — Delete Tasks (Priority: P5)

**Goal**: Developer can permanently remove a task; deleted IDs are never reused.

**Independent Test**: `todo delete 1` removes the task; `todo show 1` returns exit 2 afterward.

### Tests First — US5 (must fail before T030)

- [X] T029 [US5] Create `tests/contract/delete.test.js` — covers: AC-026 (`delete 1` → stdout `"Task 1 deleted."`, exit 0, task absent from store); AC-027 (`delete 99` → exit 2, stderr contains `"99"` and `"not found"`); AC-048 (`delete 1 --json` → valid JSON object representing the task as it existed before deletion, snake_case keys)

### Implementation — US5

- [X] T030 [US5] Create `src/commands/delete.js` — validates `<id>` (FR-044); loads store (FR-020): exit 2, stderr contains id and `"not found"`; captures task object before removal for `--json` output (FR-019a); removes task from `store.tasks`; saves store atomically (FR-037); on `--json`: `formatJson(capturedTask)` to stdout (FR-032, FR-032a, FR-032b, FR-019a); else: `Task <id> deleted.` to stdout (FR-019, FR-031); exits 0 (FR-040), 2 (FR-042), 3 (FR-043); satisfies AC-026, AC-027, AC-048

**Checkpoint**: Delete functional; US5 contract tests pass.

---

## Phase 8: User Story 6 — Machine-Readable Output (Priority: P6, cross-cutting)

**Goal**: Confirm `--json` output across all 8 commands produces valid JSON with exact
snake_case field names per FR-032a. No new source files; this phase verifies cross-cutting
compliance.

- [X] T031 [US6] Verify `--json` coverage is complete: in each of `add.test.js, list.test.js, show.test.js, update.test.js, delete.test.js, status.test.js, tag.test.js, untag.test.js` confirm a `--json` assertion exists that (a) calls `JSON.parse(stdout)` without throwing, and (b) checks for the keys `id, title, description, priority, tags, status, created_at, updated_at` (snake_case); add any missing assertions; validates AC-028, AC-029, AC-030, AC-042, AC-043, AC-044, AC-048, AC-051 all present in test suite

**Checkpoint**: All `--json` scenarios tested across all commands; FR-032, FR-032a, FR-032b fully covered.

---

## Phase 9: User Story 7 — Validation, Edge Cases, and Extended Output (Priority: P7)

**Goal**: Persistence error handling, ID format validation, atomic write verification, and
ID-never-reused property are all tested and passing.

### Tests First — US7 (must fail or be incomplete before T034)

- [X] T032 [P] [US7] Create `tests/contract/persistence.test.js` — covers: AC-031 (malformed JSON file → any command → exit 3, stderr contains file path and `"parse"`/`"invalid JSON"`, file unchanged); AC-032 (wrong schema `[]` → exit 3, stderr contains file path and `"schema"`, file unchanged); AC-033 (`TODO_FILE` parent dir absent → write command → exit 3, stderr contains file path); AC-050 (`TODO_FILE="/tmp/../../etc/x.json"` → exit 1, stderr contains `".."` or `"invalid"`); AC-054 (`add --tag work --tag work` → `show 1 --json` → `tags` array contains `"work"` exactly once); AC-056 (after `add`, no `.tmp` file remains in store directory; `tasks.json` parses as valid `{nextId,tasks}` JSON); AC-057 (add tasks id=1,2,3; delete id=3; add → new id=4; `show 4` exit 0; `show 3` exit 2 stderr contains `"3"` and `"not found"`)
- [X] T033 [P] [US7] Create `tests/contract/ids.test.js` — covers: AC-036 (`show abc` → exit 1, stderr contains `"id"` or `"integer"`); AC-037 (`show -1` → exit 1, stderr contains `"id"` or `"positive"`); AC-053 is already in `update.test.js`; also covers non-numeric IDs for `update`, `delete`, `tag`, `untag`, `status` commands (same assertion pattern, exit 1)

### Implementation note — US7

No new implementation files are required; edge-case handling is already mandated in T011
(store.js), T012 (validate.js), and T017–T030 (command files). If any contract test from T032
or T033 fails, the fix goes in the appropriate module from those earlier tasks.

**Checkpoint**: All 57 ACs covered by passing tests; `npm run test` exits 0 with ≥ 85% line coverage on `src/`.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Final quality verification and harness evidence capture.

- [X] T034 [P] Review all `src/commands/*.js` error paths — confirm every `process.stderr.write()` / `console.error()` call produces the exact "must contain" text required by AC-005, AC-006, AC-010–AC-013, AC-018, AC-019, AC-022, AC-025, AC-027, AC-034–AC-039, AC-047, AC-050, AC-053; no new files; this is a code-review pass across the 8 command files
- [X] T035 [P] Verify no file in `tests/contract/` imports any module from `src/` (harness independence, constitution §Harness Independence); each contract test file may only import from `tests/contract/helpers.js` and Node.js built-ins; fix any violations
- [X] T036 Run `npm run harness`; confirm exit code 0; inspect `evidence/harness-results/<timestamp>.txt` to verify Gate 1 (lint), Gate 2 (security), Gate 3 (test+coverage ≥ 85%) all show PASS; commit evidence file path in PR description

**Checkpoint**: Full harness green. All 36 tasks complete. Spec fully implemented.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational)  ← BLOCKS all user stories
        ├─→ Phase 3 (US1 P1)  🎯 MVP
        ├─→ Phase 4 (US2 P2)  ← parallel with others after Phase 2
        ├─→ Phase 5 (US3 P3)
        ├─→ Phase 6 (US4 P4)
        ├─→ Phase 7 (US5 P5)
        └─→ Phase 9 (US7 P7)
              └─→ Phase 8 (US6 verification, all commands done)
                    └─→ Phase 10 (Polish)
```

### Within Each Phase

```
Tests (T015, T016, T019, T021, T022, ...)   ← write first, run, confirm FAIL
  └─→ Implementation (T017, T018, T020, ...) ← make them pass
```

### User Story Dependencies

| Story | Depends On | Note |
|---|---|---|
| US1 (add, list) | Phase 2 complete | No other story dependency |
| US2 (status) | Phase 2 + US1 (need tasks to run status on) | Functionally independent |
| US3 (tag/untag) | Phase 2 + US1 | Modifies tasks created by add |
| US4 (show, update) | Phase 2 + US1 | Reads/modifies tasks |
| US5 (delete) | Phase 2 + US1 | Removes tasks |
| US6 (--json) | All commands implemented | Cross-cutting verification |
| US7 (edge cases) | Phase 2 + all commands | Tests all error paths |

---

## Parallel Opportunities

### Phase 2 (Foundational)

```bash
# Parallelizable in Phase 2:
T007  tests/contract/helpers.js
T008  tests/unit/store.test.js
T009  tests/unit/validate.test.js
T010  tests/unit/format.test.js
# After T011 done:
T012  src/validate.js   (parallel)
T013  src/format.js     (parallel)
```

### Phase 3 (US1)

```bash
# Tests parallelizable:
T015  tests/contract/add.test.js
T016  tests/contract/list.test.js
# Then implementation (sequential: T017 before T018, list depends on store state from add):
T017  src/commands/add.js
T018  src/commands/list.js
```

### Phases 5–7 (US3–US5)

```bash
# After Phase 2 completes, US3–US5 test files can be written in parallel:
T021  tests/contract/tag.test.js
T022  tests/contract/untag.test.js
T025  tests/contract/show.test.js
T026  tests/contract/update.test.js
T029  tests/contract/delete.test.js
```

---

## Implementation Strategy

### MVP (User Story 1 Only)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (harness + core modules)
3. ✅ Complete Phase 3: US1 (add + list with --json)
4. **STOP**: run `npm run harness` — all gates must pass for US1
5. MVP deliverable: working `todo add` / `todo list` with persistence

### Incremental Delivery

Each phase adds independently testable value:

| After | Capability |
|---|---|
| Phase 2 | Harness runs; core modules unit-tested |
| Phase 3 (US1) | Add tasks, list with priority sort and tag filter |
| Phase 4 (US2) | Status lifecycle management |
| Phase 5 (US3) | Tag/untag tasks |
| Phase 6 (US4) | Inspect and update task details |
| Phase 7 (US5) | Delete tasks |
| Phase 8 (US6) | Verified --json across all commands |
| Phase 9 (US7) | All 57 ACs tested, edge cases covered |
| Phase 10 | Full harness green, evidence captured |
