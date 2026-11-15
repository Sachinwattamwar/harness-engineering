# CLI Contract: Smart Todo

**Date**: 2026-11-14 | **Branch**: `001-smart-todo-cli`

The CLI is invoked as `node bin/smart-todo.js <command> [options]` (or via the `todo` bin
alias once installed). All commands accept a global `--json` flag. Errors always go to stderr.

---

## Global behaviour

| Aspect | Rule |
|---|---|
| `--json` flag | Available on every command. When set: stdout is valid JSON (snake_case keys). Errors still go to stderr. |
| stderr | All error messages go to stderr regardless of `--json`. |
| Exit codes | 0 success · 1 validation error · 2 not found · 3 storage error |
| `TODO_FILE` env var | Overrides default `./tasks.json`. Values with `..` → exit 1. |

---

## `add`

**Purpose**: Create a new task.

```
todo add --title <string> [--description <string>] [--priority low|medium|high] [--tag <tag>]... [--json]
```

| Option | Required | Validation |
|---|---|---|
| `--title` | yes | 1–120 characters |
| `--description` | no | any string (default `""`) |
| `--priority` | no | `low` \| `medium` \| `high` (default `medium`) |
| `--tag` | no, repeatable | `[a-z0-9-]+`, max 10 (after dedup), deduplicated silently |

**Success** (exit 0):
- Default: one-line stdout → `Task <id> created.`
- `--json`: stdout → full Task object (snake_case)

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| `--title` missing | 1 | `"--title"`, `"required"` |
| title < 1 or > 120 chars | 1 | `"120"`, `"character"` |
| invalid `--priority` value | 1 | `"priority"`, `"low"`, `"medium"`, `"high"` |
| tag with uppercase / space / symbol | 1 | `"lowercase"` |
| empty tag | 1 | `"tag"`, `"empty"` (or similar invalidity indicator) |
| > 10 tags after dedup | 1 | `"10"`, `"tag"` |

---

## `list`

**Purpose**: Display all tasks (optionally filtered by tags).

```
todo list [--tag <tag>]... [--json]
```

| Option | Required | Description |
|---|---|---|
| `--tag` | no, repeatable | AND-semantics filter: only tasks carrying ALL specified tags shown |

**Success** (exit 0):
- Default: human-readable table of all matching tasks, sorted by priority desc → created_at asc → id asc.
- Empty result: message indicating no tasks; not an error.
- `--json`: stdout → JSON array of Task objects (snake_case keys).

**Errors**: none beyond storage errors (exit 3).

---

## `show`

**Purpose**: Display all fields of a single task.

```
todo show <id> [--json]
```

**Success** (exit 0):
- Default: human-readable table of all task fields.
- `--json`: stdout → single Task JSON object (snake_case).

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## `update`

**Purpose**: Update one or more fields of an existing task.

```
todo update <id> [--title <string>] [--description <string>] [--priority low|medium|high] [--json]
```

At least one of `--title`, `--description`, `--priority` MUST be supplied.

**Success** (exit 0):
- Default: one-line stdout confirmation.
- `--json`: stdout → updated Task object (snake_case).
- `updated_at` is refreshed to current UTC timestamp.

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| no option flags supplied | 1 | `"at least one"` or `"--title"` |
| `--title ""` (empty) | 1 | `"title"`, `"120"` or `"1 and 120"` |
| invalid `--priority` value | 1 | `"priority"`, valid values |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## `delete`

**Purpose**: Permanently remove a task.

```
todo delete <id> [--json]
```

**Success** (exit 0):
- Default: one-line stdout → `Task <id> deleted.`
- `--json`: stdout → Task object as it existed immediately before deletion (snake_case).

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## `tag`

**Purpose**: Add a tag to a task.

```
todo tag <id> <tag> [--json]
```

If the task already has the tag: no-op, exit 0, confirmation printed.

**Success** (exit 0):
- Default: one-line stdout confirmation.
- `--json`: stdout → updated Task object (snake_case, with tag present).

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| tag charset violation (uppercase / space / symbol) | 1 | `"lowercase"` |
| empty tag | 1 | `"tag"`, invalidity indicator |
| task already has 10 tags | 1 | `"10"`, `"tag"` |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## `untag`

**Purpose**: Remove a tag from a task.

```
todo untag <id> <tag> [--json]
```

If the task does not have the tag: no-op, exit 0, confirmation printed.

**Success** (exit 0):
- Default: one-line stdout confirmation.
- `--json`: stdout → updated Task object (snake_case, with tag absent).

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| tag charset violation | 1 | `"lowercase"` |
| empty tag | 1 | `"tag"`, invalidity indicator |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## `status`

**Purpose**: Transition a task's status.

```
todo status <id> <new-status> [--json]
```

If `<new-status>` equals the task's current status: no-op, exit 0, confirmation printed.

**Success** (exit 0):
- Default: one-line stdout confirmation.
- `--json`: stdout → updated Task object (snake_case, with new status).

**Errors**:
| Condition | Exit | Stderr contains |
|---|---|---|
| non-numeric `<id>` | 1 | `"id"`, `"integer"` |
| `<id>` ≤ 0 | 1 | `"id"`, `"positive"` |
| invalid `<new-status>` value | 1 | `"status"`, `"todo"`, `"in_progress"`, `"done"` |
| forbidden transition | 1 | `"invalid transition"`, current status, requested status |
| task not found | 2 | `"<id>"`, `"not found"` |

---

## Storage errors (all commands)

| Condition | Exit | Stderr contains |
|---|---|---|
| Corrupt JSON (parse failure) | 3 | file path, `"parse"` or `"invalid JSON"` |
| Wrong schema (valid JSON, wrong structure) | 3 | file path, `"schema"` |
| Parent directory does not exist (on write) | 3 | file path |
| `TODO_FILE` contains `..` segments | 1 | `".."` or `"invalid"` |

---

## JSON output schema

All `--json` responses use the following snake_case field names exactly:

```json
{
  "id":          <integer>,
  "title":       <string>,
  "description": <string>,
  "priority":    "low" | "medium" | "high",
  "tags":        [<string>, ...],
  "status":      "todo" | "in_progress" | "done",
  "created_at":  "<ISO 8601 UTC>",
  "updated_at":  "<ISO 8601 UTC>"
}
```

`list --json` returns a JSON array `[<Task>, ...]`. All other commands return a single
`<Task>` object (or nothing, in the case of commands that have no task to return — not
applicable here since all commands either return a task or print a confirmation).
