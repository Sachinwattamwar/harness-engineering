# Smart Todo CLI — Part 1A

A command-line task manager built using Spec-Driven Development (SDD) for BITS SEZG534 Assignment 1.

## Install

```zsh
cd Part-1A
npm install
```

Requires Node.js ≥ 18 (ES modules). No `.env` needed.

## Run the CLI

```zsh
node bin/smart-todo.js --help
node bin/smart-todo.js add --title "Buy milk" --priority high
node bin/smart-todo.js list
node bin/smart-todo.js show 1
node bin/smart-todo.js update 1 --title "Buy oat milk"
node bin/smart-todo.js status 1 in_progress
node bin/smart-todo.js tag 1 shopping
node bin/smart-todo.js untag 1 shopping
node bin/smart-todo.js delete 1
```

Set `TODO_FILE` to use a custom store path:
```zsh
TODO_FILE=./my-tasks.json node bin/smart-todo.js add --title "Custom store"
```

## Quality gates

```zsh
npm test              # Vitest — 13 test files, 103 tests (unit + contract)
npm run lint          # ESLint — 0 findings = pass
npm run security      # Semgrep + npm audit — 0 findings = pass
npm run harness       # Full gate runner (lint → security → test in sequence)
```

`npm run harness` exits 0 on PASS, 1 on any gate failure.  
Raw results are written to `evidence/harness-results/run-N-<timestamp>.{md,json}`.

## Source layout

```
src/
  store.js      loadStore / saveStore — atomic write, path-traversal guard, schema validation
  validate.js   validateTitle, validatePriority, validateTag, validateId
  format.js     formatJson, formatTable, formatTaskDetail, formatConfirmation
  loader.js     loadOrExit / saveOrExit — shared error-handling wrappers used by all commands

bin/
  smart-todo.js          Commander 12 entry point
  commands/
    add.js               add command
    list.js              list command (priority sort, AND tag filter)
    show.js              show command
    update.js            update command (partial update)
    delete.js            delete command
    tag.js               tag command (10-tag limit, idempotent)
    untag.js             untag command (idempotent)
    status.js            status command (transition guard: todo→in_progress→done)
```

## Tests layout

```
tests/
  unit/
    format.test.js       formatTable, formatTaskDetail, formatJson
    store.test.js        loadStore / saveStore edge cases
    validate.test.js     all four validators
  contract/
    add.test.js          AC-001, AC-004, AC-027, AC-034, AC-040–042, AC-062
    list.test.js         AC-002, AC-003, AC-016–017, AC-028, AC-045, AC-061
    show.test.js         AC-006, AC-029, AC-052
    update.test.js       AC-023–025, AC-047, AC-051, AC-053, AC-063
    delete.test.js       AC-007, AC-048
    tag.test.js          AC-013, AC-038–039, AC-043, AC-058
    untag.test.js        AC-015, AC-044, AC-046, AC-055, AC-059
    status.test.js       AC-009–011, AC-030, AC-035, AC-049, AC-060
    ids.test.js          AC-036–037 (ID validation across all commands)
    persistence.test.js  AC-031–033, AC-050, AC-054, AC-056–057
```

## Reading the evidence folder

```
evidence/
  harness-log.md              Human-readable log of every run, repair cycles, known limitations,
                              and the final ACCEPT/REJECT decision. Start here.

  harness-results/
    run-N-<timestamp>.md      Gate-by-gate result with full stdout/stderr for run N
    run-N-<timestamp>.json    Machine-readable version of the same run

  initial-generation/         Verbatim snapshot of src/ and bin/ as first produced by the agent
                              (before any human review or repair). Shows what the harness caught.

  final-generation/           Verbatim snapshot of src/ and bin/ at the time the final harness
                              PASS was confirmed (Run 5). This is the state being merged.
```

The key narrative is in `evidence/harness-log.md`: Run 1 (Red baseline) → Run 2 (automated PASS, human REJECT) → Run 3 (coverage 84.1 %, FAIL) → repair → Run 4/5 (96.89 %, PASS).
