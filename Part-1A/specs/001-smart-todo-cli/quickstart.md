# Quickstart & Validation Guide: Smart Todo CLI

**Date**: 2026-11-14 | **Branch**: `001-smart-todo-cli`

This guide describes how to set up the project environment, run the full quality gate suite,
and manually validate the key end-to-end scenarios from the spec. It references the CLI
contract ([`contracts/cli-schema.md`](contracts/cli-schema.md)) and data model
([`data-model.md`](data-model.md)) instead of duplicating them.

---

## Prerequisites

- Node.js 22 LTS or later (`node --version` → `v22.x.x`)
- npm 10+ (bundled with Node.js 22)
- Semgrep CLI (`semgrep --version`; install via `pip install semgrep` or `brew install semgrep`)
- Git (for branch context)

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Verify toolchain
node --version           # v22.x.x
npx vitest --version     # 1.x.x or later
npx eslint --version     # 9.x.x (flat config)
semgrep --version
```

---

## Running the Full Harness

The harness runner executes all quality gates in order and writes evidence:

```bash
npm run harness
```

Gates run in this sequence:
1. **lint** — `npm run lint` → ESLint (flat config) + eslint-plugin-security; must report 0 errors/warnings
2. **security** — `npm run security` → Semgrep `p/javascript` + `p/nodejs`; `npm audit` high/critical; must report 0 findings
3. **test+coverage** — `npm run test` → Vitest `--run` with V8 coverage; must pass 100% mandatory tests; line coverage ≥ 85% on `src/`

Evidence written to `evidence/harness-results/<timestamp>.json` and
`evidence/harness-results/<timestamp>.txt`.

Exit code: `0` if all gates pass, non-zero if any gate fails.

---

## Running Individual Gates

```bash
npm run lint       # ESLint only
npm run security   # Semgrep + npm audit only
npm run test       # Vitest + coverage only
```

---

## Manual End-to-End Validation Scenarios

The following sequences correspond to acceptance criteria in the spec. Each sets `TODO_FILE`
to a temp path so the default `./tasks.json` is not polluted.

### Scenario A — Full task lifecycle (AC-001, AC-007, AC-008, AC-014, AC-026)

```bash
export TODO_FILE=$(mktemp /tmp/todo-test-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "Write plan"
# Expected stdout: Task 1 created.  Exit: 0

node bin/smart-todo.js status 1 in_progress
# Expected stdout: one-line confirmation  Exit: 0

node bin/smart-todo.js tag 1 work
# Expected stdout: one-line confirmation  Exit: 0

node bin/smart-todo.js status 1 done
# Expected stdout: one-line confirmation  Exit: 0

node bin/smart-todo.js delete 1
# Expected stdout: Task 1 deleted.  Exit: 0

node bin/smart-todo.js list
# Expected stdout: empty list message  Exit: 0
```

### Scenario B — Priority sort and tie-breaking (AC-002, AC-045)

```bash
export TODO_FILE=$(mktemp /tmp/todo-sort-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "Low task"    --priority low
node bin/smart-todo.js add --title "High task"   --priority high
node bin/smart-todo.js add --title "Medium task" --priority medium

node bin/smart-todo.js list
# Expected: High task (id=2) first, Medium task (id=3) second, Low task (id=1) third
```

### Scenario C — JSON output (AC-028, AC-029, AC-030)

```bash
export TODO_FILE=$(mktemp /tmp/todo-json-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "JSON test" --json
# Expected: valid JSON object with keys id, title, description, priority, tags, status, created_at, updated_at

node bin/smart-todo.js list --json
# Expected: valid JSON array

node bin/smart-todo.js show 1 --json
# Expected: valid JSON object; pipe through `node -e "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'))"` to validate
```

### Scenario D — Invalid status transition (AC-010)

```bash
export TODO_FILE=$(mktemp /tmp/todo-trans-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "Trans test"
node bin/smart-todo.js status 1 done
# Expected: stderr contains "invalid transition", "todo", "done"  Exit: 1
echo "Exit code: $?"
```

### Scenario E — ID never reused after deletion (AC-057)

```bash
export TODO_FILE=$(mktemp /tmp/todo-id-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "Task A"
node bin/smart-todo.js add --title "Task B"
node bin/smart-todo.js add --title "Task C"
node bin/smart-todo.js delete 3

node bin/smart-todo.js add --title "Task D"
node bin/smart-todo.js show 4   # Exit: 0
node bin/smart-todo.js show 3   # Exit: 2; stderr contains "3" and "not found"
```

### Scenario F — Corrupt file handling (AC-031)

```bash
export TODO_FILE=$(mktemp /tmp/todo-corrupt-XXXXXX.json)
echo '{not valid json' > "$TODO_FILE"

node bin/smart-todo.js list
# Expected: stderr contains file path and "parse" or "invalid JSON"  Exit: 3
echo "Exit code: $?"

# Verify file is unchanged
cat "$TODO_FILE"  # still shows '{not valid json'
```

### Scenario G — Atomic write verification (AC-056)

```bash
DIR=$(mktemp -d /tmp/todo-atomic-XXXXXX)
export TODO_FILE="$DIR/tasks.json"

node bin/smart-todo.js add --title "Atomic test"

# Verify no .tmp file left
ls "$DIR"              # should show only tasks.json
node -e "JSON.parse(require('fs').readFileSync('$TODO_FILE','utf8'))"
# Expected: no error (valid JSON)
```

### Scenario H — Path traversal rejection (AC-050)

```bash
TODO_FILE="/tmp/../../etc/tasks.json" node bin/smart-todo.js list
# Expected: stderr contains ".." or "invalid"  Exit: 1
echo "Exit code: $?"
```

### Scenario I — AND-filter tags (AC-016)

```bash
export TODO_FILE=$(mktemp /tmp/todo-tags-XXXXXX.json) && rm "$TODO_FILE"

node bin/smart-todo.js add --title "Task 1" --tag work --tag urgent
node bin/smart-todo.js add --title "Task 2" --tag work

node bin/smart-todo.js list --tag work --tag urgent
# Expected: only Task 1 appears  Exit: 0

node bin/smart-todo.js list --tag urgent
# Expected: only Task 1 appears
```

---

## Coverage Verification

After `npm run test`, the coverage report is written to `coverage/` (or stdout summary).
Confirm that `src/` line coverage is ≥ 85%:

```bash
npm run test 2>&1 | grep -E "Lines|All files"
```

A build that falls below the 85% threshold MUST fail with a non-zero exit code.

---

## Evidence Inspection

After `npm run harness`, inspect the results:

```bash
ls evidence/harness-results/
# e.g. 2026-11-14T10-00-00-000Z.json
#      2026-11-14T10-00-00-000Z.txt

cat evidence/harness-results/*.txt   # human-readable summary
```

The JSON file contains gate-by-gate pass/fail status, stdout/stderr excerpts, and overall
result for auditing purposes.
