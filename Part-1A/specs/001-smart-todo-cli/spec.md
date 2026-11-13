# Feature Specification: Smart Todo CLI

**Feature Branch**: `001-smart-todo-cli`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "Smart Todo CLI for a single developer managing personal tasks from the terminal."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and List Tasks (Priority: P1)

A developer starts using the tool on a fresh machine. They add their first task and immediately
confirm it appears in the task list sorted correctly.

**Why this priority**: Core CRUD loop — without add and list nothing else has value.

**Independent Test**: Running `todo add` followed by `todo list` on an empty store delivers a
visible, sortable task list; this alone is a usable tool.

**Acceptance Scenarios**:

1. **Given** no tasks exist, **When** the developer runs `todo add --title "Write tests"`,
   **Then** the CLI prints a success message containing the new task ID (e.g., `Task 1 created.`),
   exits with code 0, and the tasks.json file is created.

2. **Given** tasks with priorities high, medium, and low exist, **When** the developer runs
   `todo list`, **Then** the output is a human-readable table with tasks ordered
   high → medium → low; ties within the same priority are ordered by `created_at` ascending;
   the exit code is 0.

3. **Given** an empty task store, **When** the developer runs `todo list`, **Then** the CLI
   prints a message indicating no tasks exist and exits with code 0.

4. **Given** a title of exactly 120 characters is supplied, **When** the developer runs
   `todo add --title "<120-char-string>"`, **Then** the task is created successfully and the
   exit code is 0.

5. **Given** a title of 121 characters is supplied, **When** the developer runs
   `todo add --title "<121-char-string>"`, **Then** the CLI prints an error message
   (e.g., `Error: title must be between 1 and 120 characters.`) and exits with code 1;
   no task is created.

6. **Given** `--title` is omitted, **When** the developer runs `todo add`, **Then** the CLI
   prints a validation error and exits with code 1.

---

### User Story 2 - Manage Task Status Workflow (Priority: P2)

A developer moves a task through its lifecycle: from todo to in_progress when they start it,
then to done when they finish, and back to in_progress if they re-open it. Invalid jumps are
rejected immediately.

**Why this priority**: Status tracking is the primary productivity feature of a todo tool.

**Independent Test**: Running `todo status <id> in_progress` and verifying the state change
(via `todo show`) is fully testable in isolation.

**Acceptance Scenarios**:

1. **Given** a task with status `todo` exists (id=1), **When** the developer runs
   `todo status 1 in_progress`, **Then** the task status becomes `in_progress`, the CLI
   confirms the change, and the exit code is 0.

2. **Given** a task with status `in_progress` exists (id=1), **When** the developer runs
   `todo status 1 done`, **Then** the task status becomes `done`, the CLI confirms the change,
   and the exit code is 0.

3. **Given** a task with status `in_progress` exists (id=1), **When** the developer runs
   `todo status 1 todo`, **Then** the task status becomes `todo`, the CLI confirms the change,
   and the exit code is 0.

4. **Given** a task with status `todo` exists (id=1), **When** the developer runs
   `todo status 1 done`, **Then** the CLI prints an error
   (e.g., `Error: invalid transition todo → done.`) and exits with code 1; the task status
   is unchanged.

5. **Given** a task with status `done` exists (id=1), **When** the developer runs
   `todo status 1 todo`, **Then** the CLI prints an error
   (e.g., `Error: invalid transition done → todo.`) and exits with code 1; the task status
   is unchanged.

6. **Given** a task with status `done` exists (id=1), **When** the developer runs
   `todo status 1 in_progress`, **Then** the CLI prints an error
   (e.g., `Error: invalid transition done → in_progress.`) and exits with code 1; the task
   status is unchanged.

7. **Given** no task with id=99 exists, **When** the developer runs `todo status 99 done`,
   **Then** the CLI prints an error (e.g., `Error: task 99 not found.`) and exits with code 2.

---

### User Story 3 - Organise and Filter with Tags (Priority: P3)

A developer categorises tasks with tags and filters the list to focus on a subset of work.

**Why this priority**: Tags are the primary organisation mechanism; without them all tasks appear
in one undifferentiated list.

**Independent Test**: Adding tags to a task and running `todo list --tag <name>` to verify the
filtered result is fully self-contained.

**Acceptance Scenarios**:

1. **Given** a task exists (id=1), **When** the developer runs `todo tag 1 work`, **Then** the
   tag `work` appears on the task, the CLI confirms the change, and the exit code is 0.

2. **Given** a task has the tag `work` (id=1), **When** the developer runs `todo untag 1 work`,
   **Then** the tag `work` is removed, the CLI confirms the change, and the exit code is 0.

3. **Given** tasks 1 (tags: work, urgent) and 2 (tags: work) exist, **When** the developer
   runs `todo list --tag work --tag urgent`, **Then** only task 1 appears (AND semantics) and
   the exit code is 0.

4. **Given** no tasks match all specified tags, **When** the developer runs
   `todo list --tag nonexistent`, **Then** the CLI prints an empty list (no tasks) and exits
   with code 0.

5. **Given** a task already has 10 tags, **When** the developer runs `todo tag <id> eleventh`,
   **Then** the CLI prints an error (e.g., `Error: a task may have at most 10 tags.`) and
   exits with code 1; no tag is added.

6. **Given** a tag value with uppercase letters is supplied, **When** the developer runs
   `todo tag 1 WORK`, **Then** the CLI prints a validation error
   (e.g., `Error: tags must be lowercase.`) and exits with code 1.

7. **Given** a task already has the tag `work`, **When** the developer runs `todo tag 1 work`,
   **Then** the operation is a no-op (tag remains once, no duplicate), the CLI confirms
   no change was needed, and the exit code is 0.

---

### User Story 4 - Inspect and Update Individual Tasks (Priority: P4)

A developer views the full details of a single task and updates its fields.

**Why this priority**: Show and update are essential for task management but depend on the
existence of tasks from the core CRUD loop.

**Independent Test**: Running `todo show <id>` after creation verifies all stored fields are
returned correctly.

**Acceptance Scenarios**:

1. **Given** a task exists (id=1) with all fields populated, **When** the developer runs
   `todo show 1`, **Then** the CLI displays all task fields (id, title, description, priority,
   tags, status, created_at, updated_at) and exits with code 0.

2. **Given** no task with id=99 exists, **When** the developer runs `todo show 99`, **Then**
   the CLI prints an error (e.g., `Error: task 99 not found.`) and exits with code 2.

3. **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --title "Revised title"`, **Then** the task title is updated,
   `updated_at` is refreshed to the current timestamp, and the exit code is 0.

4. **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --priority high`, **Then** the task priority is updated and the exit code
   is 0.

5. **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --title ""`, **Then** the CLI prints a validation error and exits with
   code 1; the task title is unchanged.

---

### User Story 5 - Delete Tasks (Priority: P5)

A developer removes a completed or cancelled task from the store.

**Why this priority**: Deletion is a housekeeping operation; the tool is fully usable without it.

**Independent Test**: Running `todo delete <id>` and verifying the task no longer appears in
`todo list`.

**Acceptance Scenarios**:

1. **Given** a task exists (id=1), **When** the developer runs `todo delete 1`, **Then** the
   task is removed from the store, the CLI confirms the deletion
   (e.g., `Task 1 deleted.`), and the exit code is 0.

2. **Given** no task with id=99 exists, **When** the developer runs `todo delete 99`, **Then**
   the CLI prints an error (e.g., `Error: task 99 not found.`) and exits with code 2.

---

### User Story 6 - Machine-Readable Output for Scripting (Priority: P6)

A developer pipes the output of `todo list` or `todo show` into another tool (e.g., `jq`).

**Why this priority**: Nice-to-have for power users; the tool is fully usable with the default
table output.

**Independent Test**: Running `todo list --json` on a store with tasks returns valid JSON that
can be parsed by a standards-compliant JSON parser.

**Acceptance Scenarios**:

1. **Given** tasks exist, **When** the developer runs `todo list --json`, **Then** the CLI
   prints a valid JSON array of task objects to stdout and exits with code 0.

2. **Given** a task exists (id=1), **When** the developer runs `todo show 1 --json`, **Then**
   the CLI prints a valid JSON object for that task to stdout and exits with code 0.

3. **Given** an add command is run with `--json`, **When** the task is created, **Then** the
   CLI prints the created task as a JSON object and exits with code 0.

---

### Edge Cases

- What happens when the tasks.json file exists but contains malformed JSON? → Exit code 3 with
  a clear error message; no crash or data corruption.
- What happens when the tasks.json file exists but contains a valid JSON value that is not an
  object/array matching the expected schema? → Exit code 3 with a clear schema mismatch error.
- What happens when two tasks have the same priority and identical `created_at` values? →
  Stable ordering (consistent across repeated `list` invocations); no crash.
- What happens when `--title` is provided as an empty string `""`? → Exit code 1, validation
  error.
- What happens when the `TODO_FILE` env var points to a path in a directory that does not
  exist? → Exit code 3 with a clear error.
- What happens when `todo status <id>` is called with the same status the task already has? →
  No-op or informational message, exit code 0 (same state → same state is not an invalid
  transition).

## Requirements *(mandatory)*

### Functional Requirements

#### Task Creation

- **FR-001**: System MUST accept an `add` command with a mandatory `--title` option (string,
  1–120 characters).
- **FR-002**: System MUST accept an `add` command with an optional `--description` option
  (string, no length limit).
- **FR-003**: System MUST accept an `add` command with an optional `--priority` option
  (one of `low`, `medium`, `high`; default `medium` when omitted).
- **FR-004**: System MUST accept an `add` command with an optional `--tag` option that may be
  specified multiple times; each value MUST be a lowercase string.
- **FR-005**: System MUST auto-assign a unique, incrementing integer ID to each new task,
  starting at 1.
- **FR-006**: System MUST set `status` to `todo` for every newly created task.
- **FR-007**: System MUST record `created_at` and `updated_at` as ISO 8601 UTC timestamps at
  creation time.
- **FR-008**: System MUST reject a title shorter than 1 character or longer than 120 characters
  with exit code 1 and a descriptive error message.

#### Task Listing

- **FR-009**: System MUST accept a `list` command that displays all tasks.
- **FR-010**: System MUST sort the list output by priority descending (`high` > `medium` > `low`),
  with ties broken by `created_at` ascending.
- **FR-011**: System MUST accept one or more `--tag <value>` options on the `list` command;
  when provided, only tasks that carry ALL specified tags MUST be shown (AND semantics).
- **FR-012**: System MUST display an empty list (not an error) when no tasks match the filter.

#### Task Inspection

- **FR-013**: System MUST accept a `show <id>` command that displays all fields of the
  identified task.
- **FR-014**: System MUST exit with code 2 when `show` is called with an ID that does not exist.

#### Task Update

- **FR-015**: System MUST accept an `update <id>` command with optional `--title`,
  `--description`, `--priority` options; each supplied option replaces the existing value.
- **FR-016**: System MUST refresh `updated_at` to the current timestamp on every successful
  update.
- **FR-017**: System MUST exit with code 2 when `update` is called with an ID that does not
  exist.
- **FR-018**: System MUST validate updated fields with the same rules as creation; exit code 1
  on violation.

#### Task Deletion

- **FR-019**: System MUST accept a `delete <id>` command that permanently removes the task.
- **FR-020**: System MUST exit with code 2 when `delete` is called with an ID that does not
  exist.

#### Tagging

- **FR-021**: System MUST accept a `tag <id> <tag>` command that adds a lowercase tag to the
  identified task.
- **FR-022**: System MUST accept an `untag <id> <tag>` command that removes a tag from the
  identified task.
- **FR-023**: System MUST enforce that tag values consist of lowercase letters, digits, and
  hyphens only (no uppercase, no spaces).
- **FR-024**: System MUST enforce a maximum of 10 unique tags per task; a request to add an
  11th tag MUST be rejected with exit code 1.
- **FR-025**: System MUST silently de-duplicate tags; adding a tag that already exists on a
  task MUST be a no-op (exit code 0).
- **FR-026**: System MUST exit with code 2 for `tag`/`untag` calls referencing a non-existent
  task ID.

#### Status Management

- **FR-027**: System MUST accept a `status <id> <new-status>` command.
- **FR-028**: System MUST permit the following status transitions only:
  - `todo` → `in_progress`
  - `in_progress` → `done`
  - `in_progress` → `todo`
- **FR-029**: System MUST reject any other status transition with exit code 1 and an error
  message that names both the current and requested status.
- **FR-030**: System MUST treat a `status` command that requests the task's current status as
  a no-op (exit code 0).

#### Output Format

- **FR-031**: All commands MUST produce human-readable tabular output by default.
- **FR-032**: All commands MUST support a `--json` flag; when set, output MUST be valid JSON
  written to stdout.
- **FR-033**: Error messages MUST be written to stderr regardless of the `--json` flag.

#### Persistence

- **FR-034**: System MUST persist the task store to a local JSON file.
- **FR-035**: The storage file path MUST default to `./tasks.json` and MUST be overridable via
  the `TODO_FILE` environment variable.
- **FR-036**: The storage path MUST be resolved with an absolute path and validated to prevent
  path traversal.
- **FR-037**: All writes to the storage file MUST be atomic (write to a temporary file in the
  same directory, then rename to the target path).
- **FR-038**: If the storage file does not exist when any read command is first issued, the
  system MUST treat the store as empty and create the file on the next write.
- **FR-039**: If the storage file exists but contains invalid JSON or an unexpected schema,
  the system MUST exit with code 3 and a clear, actionable error message; it MUST NOT silently
  overwrite or corrupt the file.

#### Exit Codes

- **FR-040**: System MUST exit with code 0 on every successful operation.
- **FR-041**: System MUST exit with code 1 on input validation errors (invalid field values,
  invalid status transitions, constraint violations).
- **FR-042**: System MUST exit with code 2 when a referenced task ID is not found.
- **FR-043**: System MUST exit with code 3 on storage I/O errors (read failure, write failure,
  corrupt file, schema mismatch).

### Key Entities *(include if feature involves data)*

- **Task**: The core unit of work. Attributes: `id` (unique integer, auto-assigned),
  `title` (string, 1–120 chars, required), `description` (string, optional),
  `priority` (`low` | `medium` | `high`, default `medium`), `tags` (array of unique lowercase
  strings, max 10), `status` (`todo` | `in_progress` | `done`), `created_at` (ISO 8601 UTC),
  `updated_at` (ISO 8601 UTC).

- **Task Store**: The persisted collection of tasks. Represented as a JSON file containing
  an array of Task objects. The file path is configurable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer can add a task, change its status, add a tag, and delete it in under
  10 seconds of total interaction time (excluding shell startup).
- **SC-002**: All task data written in a session is fully recoverable after process exit and
  re-launch; no data is lost on clean process termination.
- **SC-003**: 100% of invalid inputs (bad title length, illegal status transitions, duplicate
  tags over the limit, uppercase tags) produce a non-zero exit code and a human-readable error
  message on stderr.
- **SC-004**: The `--json` output for every command can be parsed by a standards-compliant JSON
  parser without modification.
- **SC-005**: A multi-tag filter (`--tag A --tag B`) returns only tasks bearing all specified
  tags; no false positives and no false negatives.
- **SC-006**: A corrupt or unreadable tasks file never causes a silent failure; it always
  terminates with exit code 3 and a message that tells the developer which file is affected.

## Assumptions

- The tool is for single-developer personal use; no multi-user concurrency or locking is
  required.
- The terminal locale supports UTF-8; no special encoding handling beyond UTF-8 is in scope.
- Task IDs are assigned sequentially from 1 and are never reused after deletion (a deleted
  task's ID is retired).
- The `TODO_FILE` environment variable, when set, is trusted as a valid filesystem path; the
  system validates it only for path traversal, not for disk-quota or permissions beyond what
  the OS enforces.
- Tags are compared case-sensitively after the lowercase constraint is applied; `work` and
  `Work` are treated as a validation error (not auto-lowercased).
- The `--json` flag outputs structured data; the human-readable table format is not formally
  specified (column names and widths may vary) beyond the requirement that all task fields are
  visible.
- The `add` command outputs the created task's ID in the success message; the exact wording is
  left to implementation, but the ID MUST be present.
