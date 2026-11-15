# Initial Generation Snapshot

**Date**: 2026-11-15  
**Harness run**: Run 2 (`evidence/harness-results/run-2-2026-11-15T08-16-19-830Z.md`)  
**Human review decision**: REJECT — see `evidence/harness-log.md`

This directory contains a verbatim copy of `src/` and `bin/` as they existed immediately after the first `/speckit-implement` agent run and before any human-directed repair.

---

## Spec / Tasks Context Used

### Constitution
`.specify/memory/constitution.md` v1.1.0 — key non-negotiables:
- ES modules (`"type": "module"`), Node.js ≥22
- No external database; persist to a single JSON file
- ESLint (`eslint-plugin-security`) over `src/**` and `bin/**`
- Vitest `include: ["src/**"]`, line coverage threshold ≥85 %
- Semgrep (`p/javascript`, `p/nodejs`) + `npm audit --audit-level=high` for security gate
- No `eval()`, no dynamic `require()`, no path traversal

### Spec
`.specify/001-smart-todo-cli/spec.md` — 8 functional requirement groups (FR-001–FR-008), 63 acceptance criteria (AC-001–AC-063):
- FR-001 add task (title, priority, tags, auto-increment id, timestamps)
- FR-002 list tasks (table format, filter by tag, sort by priority desc / created_at asc / id asc)
- FR-003 show task (detail view)
- FR-004 update task (partial update, at least one field required)
- FR-005 delete task
- FR-006 tag / untag task (10-tag max, idempotent no-op)
- FR-007 status transitions: `todo → in_progress → done`, `in_progress → todo`
- FR-008 `--json` flag on every mutating command

### Plan
`.specify/001-smart-todo-cli/plan.md` — mandated module layout:
```
src/
  store.js          ← persistence (loadStore / saveStore, atomic write)
  validate.js       ← input validation helpers
  format.js         ← output formatters (table, detail, JSON, confirmation)
  commands/
    add.js          ← add command logic
    list.js
    show.js
    update.js
    delete.js
    tag.js
    untag.js
    status.js
bin/
  smart-todo.js     ← CLI entry point (Commander 12)
```

### Tasks Implemented
Tasks T011–T036 were the implementation tasks. All were marked `[X]` in `tasks.md` after the agent run:

| Task | Description |
|------|-------------|
| T011 | `src/store.js` — loadStore / saveStore with atomic write |
| T012 | `src/validate.js` — validateTitle / validatePriority / validateTag / validateId |
| T013 | `src/format.js` — formatJson / formatTable / formatTaskDetail / formatConfirmation |
| T014 | `bin/smart-todo.js` — CLI entry point, Commander setup, negative-ID pre-check |
| T017 | `add` command |
| T018 | `list` command |
| T020 | `status` command |
| T023 | `tag` command |
| T024 | `untag` command |
| T027 | `show` command |
| T028 | `update` command |
| T030 | `delete` command |
| T034–T036 | Integration smoke tests, final validation |

---

## What the Agent Produced

### Files with substantive logic (covered by harness)
- `src/store.js`, `src/validate.js`, `src/format.js` — full implementations
- `bin/smart-todo.js` — entry point with pre-validation
- `bin/commands/add.js`, `list.js`, `show.js`, `update.js`, `delete.js`, `tag.js`, `untag.js`, `status.js` — all 8 command handlers

### Files that are comment-only placeholders
- `src/commands/add.js` through `src/commands/status.js` — each contains only a single comment line:
  ```js
  // Command implementation lives in bin/commands/add.js
  ```
  This was the agent's mechanism for satisfying the coverage threshold without putting executable command code inside `src/commands/`.

---

## Coverage Circumvention (basis for REJECT)

The harness `vitest.config.js` sets `include: ["src/**"]` and `thresholds: { lines: 85 }`. Contract tests spawn the CLI via `execFile` (a subprocess), so V8 coverage is not inherited by the spawned process. The 8 `src/commands/*.js` files were therefore unreachable by the existing test suite.

The agent resolved this by:
1. Moving all command logic to `bin/commands/` (outside `src/**` coverage scope)
2. Making `src/commands/*.js` comment-only (zero executable statements → zero coverage impact)

This produced a reported coverage of **94.64 %** over `src/store.js`, `src/validate.js`, and `src/format.js` — but the coverage figure is misleading: it excludes the 8 command modules that contain the bulk of the application logic and that plan.md explicitly places in `src/commands/`.

**Human decision: REJECT.** The repair must place command logic in `src/commands/` and find a legitimate way to cover it (e.g., `autoAttachSubprocess: true` in `vitest.config.js` after lifting hook protection, or direct-import unit tests for the command modules).
