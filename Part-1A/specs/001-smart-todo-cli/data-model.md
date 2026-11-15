# Data Model: Smart Todo CLI

**Date**: 2026-11-14 | **Branch**: `001-smart-todo-cli`

---

## Task

The core unit of work persisted to the JSON store.

| Field | JSON key | Type | Constraints | Default |
|---|---|---|---|---|
| ID | `id` | integer | > 0; unique; never reused after deletion; assigned from `nextId` | auto |
| Title | `title` | string | 1–120 characters (inclusive); required | — |
| Description | `description` | string | optional; no length limit; may be empty string | `""` |
| Priority | `priority` | enum string | one of `"low"` \| `"medium"` \| `"high"` | `"medium"` |
| Tags | `tags` | string[] | each tag: `[a-z0-9-]+`, non-empty; array unique; max 10 items | `[]` |
| Status | `status` | enum string | one of `"todo"` \| `"in_progress"` \| `"done"` | `"todo"` |
| Created at | `created_at` | ISO 8601 string | UTC; set once at creation; never updated | `new Date().toISOString()` |
| Updated at | `updated_at` | ISO 8601 string | UTC; set at creation; refreshed on every mutation | `new Date().toISOString()` |

### JSON representation (example)

```json
{
  "id": 1,
  "title": "Write acceptance tests",
  "description": "Cover all AC-001 through AC-057",
  "priority": "high",
  "tags": ["work", "testing"],
  "status": "in_progress",
  "created_at": "2026-11-14T09:00:00.000Z",
  "updated_at": "2026-11-14T10:30:00.000Z"
}
```

### Validation rules

| Rule | Applies to | Violation → |
|---|---|---|
| Title 1–120 chars | `add`, `update --title` | exit 1; stderr contains `"120"` and `"character"` |
| `--title` required on `add` | `add` | exit 1; stderr contains `"--title"` and `"required"` |
| Priority enum | `add --priority`, `update --priority` | exit 1; stderr contains `"priority"` and valid values |
| Tag charset `[a-z0-9-]` | `tag`, `untag`, `add --tag` | exit 1; stderr contains `"lowercase"` |
| Tag non-empty | `tag`, `untag`, `add --tag` | exit 1; stderr contains `"tag"` and invalidity indicator |
| Tags max 10 | `tag`, `add --tag` | exit 1; stderr contains `"10"` and `"tag"` |
| ID positive integer | all commands taking `<id>` | exit 1; stderr contains `"id"` or `"integer"` / `"positive"` |
| At least one flag | `update` | exit 1; stderr contains `"at least one"` or `"--title"` |
| `update --title ""` | `update` | exit 1 (title constraint) |

### Status transition graph

```
   ┌─────────────────────────────────────┐
   │                                     ▼
todo ──→ in_progress ──→ done   (done: terminal, no outgoing)
            ▲
            └── (in_progress → todo allowed)
```

| From | To | Allowed |
|---|---|---|
| `todo` | `in_progress` | ✅ |
| `in_progress` | `done` | ✅ |
| `in_progress` | `todo` | ✅ |
| `todo` | `done` | ❌ exit 1; stderr contains `"invalid transition"`, `"todo"`, `"done"` |
| `done` | `todo` | ❌ exit 1; stderr contains `"invalid transition"`, `"done"`, `"todo"` |
| `done` | `in_progress` | ❌ exit 1; stderr contains `"invalid transition"`, `"done"`, `"in_progress"` |
| any | same | no-op; exit 0; one-line confirmation to stdout |

---

## Task Store

The persistence container written to the JSON file.

| Field | JSON key | Type | Constraints |
|---|---|---|---|
| Next ID counter | `nextId` | integer | ≥ 1; monotonically increases; never decremented after deletion |
| Task array | `tasks` | Task[] | ordered array; IDs within are unique |

### JSON representation (example)

```json
{
  "nextId": 4,
  "tasks": [
    { "id": 1, "title": "...", ... },
    { "id": 2, "title": "...", ... }
  ]
}
```

### Schema invariants

- Top-level value MUST be a JSON object with exactly the keys `"nextId"` (integer) and `"tasks"`
  (array). Any other shape is treated as corrupt → exit 3.
- `nextId` MUST be an integer ≥ 1 and MUST be strictly greater than the highest `id` in `tasks`
  (or equal to 1 when `tasks` is empty).
- Task `id` values within the `tasks` array MUST be unique.
- A file that is valid JSON but violates these invariants → exit 3; stderr contains file path
  and `"schema"`.

### Storage path resolution

1. Read `process.env.TODO_FILE`; if unset, use `"./tasks.json"`.
2. If the value contains `..` path segments → reject with exit 1; stderr contains `".."` or
   `"invalid"`.
3. `path.resolve(rawPath)` → absolute path used for all subsequent I/O.
4. On first write (file absent): create directory if needed? No — if parent directory does not
   exist, write fails → exit 3; stderr contains file path.

### Atomic write sequence

```
1. serialize  = JSON.stringify(store, null, 2)
2. tmpPath    = resolvedPath + ".tmp"
3. await fs.writeFile(tmpPath, serialize, "utf8")
4. await fs.rename(tmpPath, resolvedPath)
   ^ atomic on POSIX (same fs); on power failure only old or new state exists
5. If any step throws → exit 3; stderr contains file path; original file untouched
```

---

## Sort Order for `list`

Tasks are sorted by three keys in order:

| Key | Direction | Tie-break |
|---|---|---|
| `priority` | descending (`high` > `medium` > `low`) | primary |
| `created_at` | ascending (oldest first) | secondary |
| `id` | ascending (lower id first) | tertiary (deterministic) |

Priority numeric mapping for sort: `high = 3`, `medium = 2`, `low = 1`.

---

## Tag Deduplication Rules

| Scenario | Behaviour |
|---|---|
| `tag <id> <tag>` where tag already on task | no-op; exit 0; one-line confirmation (FR-025) |
| `untag <id> <tag>` where tag not on task | no-op; exit 0; one-line confirmation (FR-025a) |
| `add --tag t --tag t` (duplicate in same invocation) | deduplicate silently; task stored with one copy (FR-025b) |
| `add --tag t1 --tag t2 ... --tag t11` (11 distinct) | exit 1; tag limit enforced before creation (FR-024) |
