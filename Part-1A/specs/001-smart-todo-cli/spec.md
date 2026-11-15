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

1. **[AC-001]** **Given** no tasks exist, **When** the developer runs `todo add --title "Write tests"`,
   **Then** the CLI prints a one-line success message containing the new task ID to stdout
   (e.g., `Task 1 created.`), exits with code 0, and the tasks.json file is created.
   *Covers: FR-001, FR-005, FR-006, FR-007, FR-034, FR-038, FR-040*

2. **[AC-002]** **Given** tasks with priorities high, medium, and low exist, **When** the developer runs
   `todo list`, **Then** the output is a human-readable table with tasks ordered
   high → medium → low; ties within the same priority are ordered by `created_at` ascending,
   then by `id` ascending; the exit code is 0.
   *Covers: FR-009, FR-010, FR-031, FR-040*

3. **[AC-003]** **Given** an empty task store, **When** the developer runs `todo list`, **Then** the CLI
   prints a message indicating no tasks exist and exits with code 0.
   *Covers: FR-009, FR-012, FR-040*

4. **[AC-004]** **Given** a title of exactly 120 characters is supplied, **When** the developer runs
   `todo add --title "<120-char-string>"`, **Then** the task is created successfully and the
   exit code is 0.
   *Covers: FR-001, FR-008, FR-040*

5. **[AC-005]** **Given** a title of 121 characters is supplied, **When** the developer runs
   `todo add --title "<121-char-string>"`, **Then** the CLI writes to stderr a message
   containing `"120"` and `"character"` (e.g., `"title must be between 1 and 120
   characters"`), exits with code 1; no task is created.
   *Covers: FR-008, FR-033, FR-041*

6. **[AC-006]** **Given** `--title` is omitted, **When** the developer runs `todo add`, **Then** the CLI
   writes to stderr a message containing `"--title"` and `"required"`, exits with code 1;
   no task is created.
   *Covers: FR-001, FR-008, FR-033, FR-041*

---

### User Story 2 - Manage Task Status Workflow (Priority: P2)

A developer moves a task through its lifecycle: from todo to in_progress when they start it,
then to done when they finish, and back to in_progress if they re-open it. Invalid jumps are
rejected immediately.

**Why this priority**: Status tracking is the primary productivity feature of a todo tool.

**Independent Test**: Running `todo status <id> in_progress` and verifying the state change
(via `todo show`) is fully testable in isolation.

**Acceptance Scenarios**:

1. **[AC-007]** **Given** a task with status `todo` exists (id=1), **When** the developer runs
   `todo status 1 in_progress`, **Then** the task status becomes `in_progress`, the CLI
   prints a one-line confirmation to stdout, and the exit code is 0.
   *Covers: FR-027, FR-028, FR-031, FR-040*

2. **[AC-008]** **Given** a task with status `in_progress` exists (id=1), **When** the developer runs
   `todo status 1 done`, **Then** the task status becomes `done`, the CLI prints a one-line
   confirmation to stdout, and the exit code is 0.
   *Covers: FR-027, FR-028, FR-031, FR-040*

3. **[AC-009]** **Given** a task with status `in_progress` exists (id=1), **When** the developer runs
   `todo status 1 todo`, **Then** the task status becomes `todo`, the CLI prints a one-line
   confirmation to stdout, and the exit code is 0.
   *Covers: FR-027, FR-028, FR-031, FR-040*

4. **[AC-010]** **Given** a task with status `todo` exists (id=1), **When** the developer runs
   `todo status 1 done`, **Then** the CLI writes to stderr a message containing
   `"invalid transition"`, `"todo"`, and `"done"`, exits with code 1; the task status
   is unchanged.
   *Covers: FR-027, FR-029, FR-033, FR-041*

5. **[AC-011]** **Given** a task with status `done` exists (id=1), **When** the developer runs
   `todo status 1 todo`, **Then** the CLI writes to stderr a message containing
   `"invalid transition"`, `"done"`, and `"todo"`, exits with code 1; the task status
   is unchanged.
   *Covers: FR-027, FR-029, FR-033, FR-041*

6. **[AC-012]** **Given** a task with status `done` exists (id=1), **When** the developer runs
   `todo status 1 in_progress`, **Then** the CLI writes to stderr a message containing
   `"invalid transition"`, `"done"`, and `"in_progress"`, exits with code 1; the task
   status is unchanged.
   *Covers: FR-027, FR-029, FR-033, FR-041*

7. **[AC-013]** **Given** no task with id=99 exists, **When** the developer runs `todo status 99 done`,
   **Then** the CLI writes to stderr a message containing `"99"` and `"not found"`, exits
   with code 2.
   *Covers: FR-027, FR-033, FR-042*

---

### User Story 3 - Organise and Filter with Tags (Priority: P3)

A developer categorises tasks with tags and filters the list to focus on a subset of work.

**Why this priority**: Tags are the primary organisation mechanism; without them all tasks appear
in one undifferentiated list.

**Independent Test**: Adding tags to a task and running `todo list --tag <name>` to verify the
filtered result is fully self-contained.

**Acceptance Scenarios**:

1. **[AC-014]** **Given** a task exists (id=1), **When** the developer runs `todo tag 1 work`, **Then** the
   tag `work` appears on the task, the CLI prints a one-line confirmation to stdout, and the
   exit code is 0.
   *Covers: FR-021, FR-023, FR-031, FR-040*

2. **[AC-015]** **Given** a task has the tag `work` (id=1), **When** the developer runs `todo untag 1 work`,
   **Then** the tag `work` is removed, the CLI prints a one-line confirmation to stdout, and
   the exit code is 0.
   *Covers: FR-022, FR-031, FR-040*

3. **[AC-016]** **Given** tasks 1 (tags: work, urgent) and 2 (tags: work) exist, **When** the developer
   runs `todo list --tag work --tag urgent`, **Then** only task 1 appears (AND semantics) and
   the exit code is 0.
   *Covers: FR-011, FR-040*

4. **[AC-017]** **Given** no tasks match all specified tags, **When** the developer runs
   `todo list --tag nonexistent`, **Then** the CLI prints an empty list (no tasks) and exits
   with code 0.
   *Covers: FR-011, FR-012, FR-040*

5. **[AC-018]** **Given** a task already has 10 tags, **When** the developer runs `todo tag <id> eleventh`,
   **Then** the CLI writes to stderr a message containing `"10"` and `"tag"` (e.g., `"at most
   10 tags"`), exits with code 1; no tag is added.
   *Covers: FR-024, FR-033, FR-041*

6. **[AC-019]** **Given** a tag value with uppercase letters is supplied, **When** the developer runs
   `todo tag 1 WORK`, **Then** the CLI writes to stderr a message containing `"lowercase"`,
   exits with code 1; no tag is added.
   *Covers: FR-023, FR-033, FR-041*

7. **[AC-020]** **Given** a task already has the tag `work`, **When** the developer runs `todo tag 1 work`,
   **Then** the operation is a no-op (tag remains once, no duplicate), the CLI prints a
   one-line confirmation to stdout indicating no change was needed, and the exit code is 0.
   *Covers: FR-025, FR-040*

---

### User Story 4 - Inspect and Update Individual Tasks (Priority: P4)

A developer views the full details of a single task and updates its fields.

**Why this priority**: Show and update are essential for task management but depend on the
existence of tasks from the core CRUD loop.

**Independent Test**: Running `todo show <id>` after creation verifies all stored fields are
returned correctly.

**Acceptance Scenarios**:

1. **[AC-021]** **Given** a task exists (id=1) with all fields populated, **When** the developer runs
   `todo show 1`, **Then** the CLI displays all task fields (id, title, description, priority,
   tags, status, created_at, updated_at) in a human-readable table and exits with code 0.
   *Covers: FR-013, FR-031, FR-040*

2. **[AC-022]** **Given** no task with id=99 exists, **When** the developer runs `todo show 99`, **Then**
   the CLI writes to stderr a message containing `"99"` and `"not found"`, exits with code 2.
   *Covers: FR-014, FR-033, FR-042*

3. **[AC-023]** **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --title "Revised title"`, **Then** the task title is updated,
   `updated_at` is refreshed to the current timestamp, the CLI prints a one-line confirmation
   to stdout, and the exit code is 0.
   *Covers: FR-015, FR-016, FR-031, FR-040*

4. **[AC-024]** **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --priority high`, **Then** the task priority is updated, the CLI prints a
   one-line confirmation to stdout, and the exit code is 0.
   *Covers: FR-015, FR-016, FR-031, FR-040*

5. **[AC-025]** **Given** a task exists (id=1), **When** the developer runs
   `todo update 1 --title ""`, **Then** the CLI writes to stderr a message containing
   `"title"` and a length constraint indicator (e.g., `"120"` or `"1 and 120"`), exits with
   code 1; the task title is unchanged.
   *Covers: FR-018, FR-033, FR-041*

---

### User Story 5 - Delete Tasks (Priority: P5)

A developer removes a completed or cancelled task from the store.

**Why this priority**: Deletion is a housekeeping operation; the tool is fully usable without it.

**Independent Test**: Running `todo delete <id>` and verifying the task no longer appears in
`todo list`.

**Acceptance Scenarios**:

1. **[AC-026]** **Given** a task exists (id=1), **When** the developer runs `todo delete 1`, **Then** the
   task is removed from the store, the CLI prints a one-line confirmation to stdout
   (e.g., `Task 1 deleted.`), and the exit code is 0.
   *Covers: FR-019, FR-031, FR-040*

2. **[AC-027]** **Given** no task with id=99 exists, **When** the developer runs `todo delete 99`, **Then**
   the CLI writes to stderr a message containing `"99"` and `"not found"`, exits with code 2.
   *Covers: FR-020, FR-033, FR-042*

---

### User Story 6 - Machine-Readable Output for Scripting (Priority: P6)

A developer pipes the output of `todo list` or `todo show` into another tool (e.g., `jq`).

**Why this priority**: Nice-to-have for power users; the tool is fully usable with the default
table output.

**Independent Test**: Running `todo list --json` on a store with tasks returns valid JSON that
can be parsed by a standards-compliant JSON parser.

**Acceptance Scenarios**:

1. **[AC-028]** **Given** tasks exist, **When** the developer runs `todo list --json`, **Then** the CLI
   prints to stdout a valid JSON array of task objects, all field names in snake_case
   (`id`, `title`, `description`, `priority`, `tags`, `status`, `created_at`, `updated_at`),
   and exits with code 0.
   *Covers: FR-032, FR-032a, FR-040*

2. **[AC-029]** **Given** a task exists (id=1), **When** the developer runs `todo show 1 --json`, **Then**
   the CLI prints to stdout a valid JSON object for that task with all field names in
   snake_case, and exits with code 0.
   *Covers: FR-032, FR-032a, FR-040*

3. **[AC-030]** **Given** an `add` command is run with `--json`, **When** the task is created, **Then** the
   CLI prints the created task as a JSON object with all field names in snake_case to stdout,
   and exits with code 0.
   *Covers: FR-032, FR-032a, FR-032b, FR-040*

---

### User Story 7 - Validation, Edge Cases, and Extended Output (Priority: P7)

A developer exercises the system boundaries: invalid inputs, corrupt storage, path traversal,
and machine-readable output for mutation commands.

**Why this priority**: These scenarios protect against silent failures and ensure the harness can
verify every observable behavior defined by the spec.

**Independent Test**: Each scenario can be tested independently against a controlled task store
state.

**Acceptance Scenarios**:

1. **[AC-031]** **Given** the tasks.json file contains malformed JSON (e.g., `{not valid`), **When** any
   command is run, **Then** the CLI writes to stderr a message containing the file path and
   either `"parse"` or `"invalid JSON"`, exits with code 3, and the file contents are left
   unchanged.
   *Covers: FR-039, FR-043*

2. **[AC-032]** **Given** the tasks.json file contains valid JSON but not the expected object schema
   (e.g., a bare JSON array `[]` instead of `{"nextId":...,"tasks":[]}`), **When** any command
   is run, **Then** the CLI writes to stderr a message containing the file path and `"schema"`,
   exits with code 3, and the file is left unchanged.
   *Covers: FR-039, FR-043*

3. **[AC-033]** **Given** the `TODO_FILE` env var points to a path whose parent directory does not exist,
   **When** any command that would write to the file is run, **Then** the CLI writes to stderr
   a message containing the file path, exits with code 3.
   *Covers: FR-035, FR-043*

4. **[AC-034]** **Given** `--priority` is set to an invalid value (e.g., `critical`), **When** the
   developer runs `todo add --title "X" --priority critical`, **Then** the CLI writes to
   stderr a message containing `"priority"` and the valid values (`"low"`, `"medium"`,
   `"high"`), exits with code 1; no task is created.
   *Covers: FR-003, FR-033, FR-041*

5. **[AC-035]** **Given** an invalid status value is supplied (e.g., `archived`), **When** the developer
   runs `todo status 1 archived`, **Then** the CLI writes to stderr a message containing
   `"status"` and the valid values (`"todo"`, `"in_progress"`, `"done"`), exits with code 1.
   *Covers: FR-027, FR-033, FR-041*

6. **[AC-036]** **Given** a non-numeric string is supplied as a task ID (e.g., `abc`), **When** any
   command that takes an `<id>` argument is run with `abc`, **Then** the CLI writes to stderr
   a message containing `"id"` or `"integer"`, exits with code 1.
   *Covers: FR-044, FR-033, FR-041*

7. **[AC-037]** **Given** a negative integer is supplied as a task ID (e.g., `-1`), **When** any command
   that takes an `<id>` argument is run with `-1`, **Then** the CLI writes to stderr a message
   containing `"id"` or `"positive"`, exits with code 1.
   *Covers: FR-044, FR-033, FR-041*

8. **[AC-038]** **Given** a tag value containing a space or special symbol (e.g., `my tag` or `work!`)
   is supplied, **When** the developer runs `todo tag 1 "my tag"`, **Then** the CLI writes to
   stderr a message containing `"lowercase"` or the allowed character set description, exits
   with code 1; no tag is added.
   *Covers: FR-023, FR-033, FR-041*

9. **[AC-039]** **Given** an empty string is supplied as a tag value, **When** the developer runs
   `todo tag 1 ""`, **Then** the CLI writes to stderr a message containing `"tag"` and
   indicating the value is invalid (e.g., `"empty"`), exits with code 1; no tag is added.
   *Covers: FR-023, FR-033, FR-041*

10. **[AC-040]** **Given** an `add` command is supplied with 11 `--tag` arguments, **When** the developer
    runs `todo add --title "X" --tag t1 ... --tag t11`, **Then** the CLI writes to stderr a
    message containing `"10"` and `"tag"`, exits with code 1; no task is created.
    *Covers: FR-004, FR-024, FR-033, FR-041*

11. **[AC-041]** **Given** an uppercase tag is supplied in an `add` command (e.g., `--tag WORK`), **When**
    the developer runs `todo add --title "X" --tag WORK`, **Then** the CLI writes to stderr a
    message containing `"lowercase"`, exits with code 1; no task is created.
    *Covers: FR-004, FR-023, FR-033, FR-041*

12. **[AC-042]** **Given** a valid status transition is performed with `--json`, **When** the developer
    runs `todo status 1 in_progress --json`, **Then** the CLI prints to stdout a valid JSON
    object representing the updated task (all field names in snake_case) and exits with code 0.
    *Covers: FR-032, FR-032a, FR-032b, FR-040*

13. **[AC-043]** **Given** a tag is successfully added with `--json`, **When** the developer runs
    `todo tag 1 work --json`, **Then** the CLI prints to stdout a valid JSON object representing
    the updated task (all field names in snake_case) and exits with code 0.
    *Covers: FR-032, FR-032a, FR-032b, FR-040*

14. **[AC-044]** **Given** a tag is successfully removed with `--json`, **When** the developer runs
    `todo untag 1 work --json`, **Then** the CLI prints to stdout a valid JSON object
    representing the updated task (all field names in snake_case) and exits with code 0.
    *Covers: FR-032, FR-032a, FR-032b, FR-040*

15. **[AC-045]** **Given** two tasks have equal priority and identical `created_at` timestamps, **When**
    the developer runs `todo list`, **Then** the tasks appear in ascending order of `id` (lower
    id first) and the exit code is 0.
    *Covers: FR-010, FR-040*

16. **[AC-046]** **Given** a task exists (id=1) that does not have the tag `missing`, **When** the
    developer runs `todo untag 1 missing`, **Then** the operation is a no-op, the CLI prints a
    one-line confirmation to stdout indicating no change was needed, and the exit code is 0.
    *Covers: FR-025a, FR-040*

17. **[AC-047]** **Given** a task exists (id=1), **When** the developer runs `todo update 1` with no
    option flags, **Then** the CLI writes to stderr a message containing `"at least one"` or
    `"--title"`, exits with code 1; the task is unchanged.
    *Covers: FR-018a, FR-033, FR-041*

18. **[AC-048]** **Given** a task exists (id=1), **When** the developer runs `todo delete 1 --json`,
    **Then** the CLI prints to stdout a valid JSON object representing the task as it existed
    immediately before deletion (all field names in snake_case) and exits with code 0.
    *Covers: FR-019a, FR-032, FR-032a, FR-032b, FR-040*

19. **[AC-049]** **Given** a task with status `in_progress` exists (id=1), **When** the developer runs
    `todo status 1 in_progress`, **Then** the operation is a no-op, the CLI prints a one-line
    confirmation to stdout indicating no change was needed, and the exit code is 0.
    *Covers: FR-030, FR-040*

20. **[AC-050]** **Given** `TODO_FILE` is set to a path containing `..` segments
    (e.g., `/tmp/../../etc/tasks.json`), **When** any command is run, **Then** the CLI writes
    to stderr a message containing `".."` or `"invalid"`, exits with code 1.
    *Covers: FR-036, FR-033, FR-041*

21. **[AC-051]** **Given** a task exists (id=1), **When** the developer runs
    `todo update 1 --title "New" --json`, **Then** the CLI prints to stdout a valid JSON object
    representing the updated task (all field names in snake_case) and exits with code 0.
    *Covers: FR-032, FR-032a, FR-032b, FR-040*

22. **[AC-052]** **Given** a task is created with `todo add --title "Deploy" --description "Push to
    prod"`, **When** the developer runs `todo show <id>`, **Then** the output includes the
    description field with the value `"Push to prod"` and the exit code is 0.
    *Covers: FR-002, FR-013, FR-040*

23. **[AC-053]** **Given** no task with id=99 exists, **When** the developer runs
    `todo update 99 --title "X"`, **Then** the CLI writes to stderr a message containing
    `"99"` and `"not found"`, exits with code 2; no task is created or modified.
    *Covers: FR-017, FR-033, FR-042*

24. **[AC-054]** **Given** an `add` command is run with `--tag work --tag work` (duplicate tag
    values), **When** the task is created, **Then** `todo show <id> --json` shows the `tags`
    array contains `"work"` exactly once, and the exit code is 0.
    *Covers: FR-025b, FR-040*

25. **[AC-055]** **Given** no task with id=99 exists, **When** the developer runs
    `todo tag 99 work`, **Then** the CLI writes to stderr a message containing `"99"` and
    `"not found"`, exits with code 2. **And given** the same precondition, **When** the
    developer runs `todo untag 99 work`, **Then** the CLI writes to stderr a message containing
    `"99"` and `"not found"`, exits with code 2.
    *Covers: FR-026, FR-033, FR-042*

26. **[AC-056]** **Given** any mutation command (`add`, `update`, `delete`, `status`, `tag`,
    `untag`) completes successfully, **When** the directory containing the tasks file is
    inspected, **Then** no temporary write file remains alongside tasks.json (e.g., no
    `.tmp`, `.bak`, or partial file), and reading tasks.json produces valid, parseable JSON
    with the expected `{ "nextId": ..., "tasks": [...] }` structure.
    *Covers: FR-037, FR-040*

27. **[AC-057]** **Given** three tasks have been added (assigned ids 1, 2, 3) and task id=3 has
    been deleted, **When** the developer runs `todo add --title "New task"`, **Then** the new
    task is assigned id=4 (not id=3), `todo show 4` succeeds with exit code 0, and
    `todo show 3` exits with code 2 and stderr containing `"3"` and `"not found"`.
    *Covers: FR-005, FR-040, FR-042*

28. **[AC-058]** **Given** a task exists (id=1) already carrying tag `work`, **When** the developer
    runs `todo tag 1 work --json`, **Then** the CLI prints to stdout a valid JSON object representing
    the unchanged task (all field names in snake_case, `"work"` present in `tags` array) and exits
    with code 0.
    *Covers: FR-025, FR-032, FR-032a, FR-032b, FR-040*

29. **[AC-059]** **Given** a task exists (id=1) that does not carry tag `missing`, **When** the
    developer runs `todo untag 1 missing --json`, **Then** the CLI prints to stdout a valid JSON
    object representing the unchanged task (all field names in snake_case, `"missing"` absent from
    `tags` array) and exits with code 0.
    *Covers: FR-025a, FR-032, FR-032a, FR-032b, FR-040*

30. **[AC-060]** **Given** a task exists (id=1) with status `in_progress`, **When** the developer
    runs `todo status 1 in_progress --json`, **Then** the CLI prints to stdout a valid JSON object
    representing the unchanged task (all field names in snake_case, `"status": "in_progress"`) and
    exits with code 0.
    *Covers: FR-030, FR-032, FR-032a, FR-032b, FR-040*

31. **[AC-061]** **Given** no tasks exist, **When** the developer runs `todo list --json`, **Then**
    the CLI prints `[]` (a valid empty JSON array) to stdout and exits with code 0.
    *Covers: FR-009, FR-012, FR-032, FR-032a, FR-040*

32. **[AC-062]** **Given** an `add` command is supplied with exactly 10 distinct `--tag` values,
    **When** the developer runs `todo add --title "X" --tag t1 --tag t2 ... --tag t10`, **Then**
    the task is created with all 10 tags present, the CLI prints a one-line confirmation, and the
    exit code is 0.
    *Covers: FR-004, FR-024, FR-040*

33. **[AC-063]** **Given** a task exists (id=1) with a non-empty description, **When** the developer
    runs `todo update 1 --description "" --json`, **Then** the CLI prints to stdout a valid JSON
    object with `"description": ""` (empty string, not null), `updated_at` refreshed, and exits
    with code 0.
    *Covers: FR-002, FR-015, FR-016, FR-032, FR-032a, FR-032b, FR-040*

---

### Edge Cases

- What happens when the tasks.json file exists but contains malformed JSON? → AC-031 (exit 3,
  file left unchanged).
- What happens when the tasks.json file contains valid JSON but wrong schema? → AC-032 (exit 3,
  file left unchanged).
- What happens when two tasks have the same priority and identical `created_at` values? →
  AC-045 (ordered by `id` ascending).
- What happens when `--title` is provided as an empty string `""`? → AC-025 (exit 1,
  stderr must contain "title" and length constraint).
- What happens when the `TODO_FILE` env var points to a directory that does not exist? →
  AC-033 (exit 3).
- What happens when `todo status <id>` is called with the same status the task already has? →
  AC-049 (no-op, exit 0, one-line confirmation).
- What happens when `TODO_FILE` contains `..` path segments? → AC-050 (exit 1, stderr must
  contain `".."` or `"invalid"`).

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
  specified multiple times; each value MUST be a lowercase string conforming to FR-023.
- **FR-005**: System MUST auto-assign a unique, incrementing integer ID to each new task using
  the `nextId` counter persisted in the task store; `nextId` starts at 1, is incremented by 1
  on each creation, and is never reset or decremented after deletion.
- **FR-006**: System MUST set `status` to `todo` for every newly created task.
- **FR-007**: System MUST record `created_at` and `updated_at` as ISO 8601 UTC timestamps at
  creation time.
- **FR-008**: System MUST reject a title shorter than 1 character or longer than 120 characters
  with exit code 1; stderr MUST contain `"120"` and `"character"`.

#### Task Listing

- **FR-009**: System MUST accept a `list` command that displays all tasks in a human-readable
  table.
- **FR-010**: System MUST sort the list output by three keys in order: priority descending
  (`high` > `medium` > `low`), then `created_at` ascending, then `id` ascending (to break
  remaining ties deterministically).
- **FR-011**: System MUST accept one or more `--tag <value>` options on the `list` command;
  when provided, only tasks that carry ALL specified tags MUST be shown (AND semantics).
- **FR-012**: System MUST display an empty list (not an error) when no tasks match the filter.

#### Task Inspection

- **FR-013**: System MUST accept a `show <id>` command that displays all fields of the
  identified task in a human-readable table.
- **FR-014**: System MUST exit with code 2 when `show` is called with an ID that does not
  exist; stderr MUST contain the ID and `"not found"`.

#### Task Update

- **FR-015**: System MUST accept an `update <id>` command with optional `--title`,
  `--description`, `--priority` options; each supplied option replaces the existing value.
- **FR-016**: System MUST refresh `updated_at` to the current timestamp on every successful
  update.
- **FR-017**: System MUST exit with code 2 when `update` is called with an ID that does not
  exist; stderr MUST contain the ID and `"not found"`.
- **FR-018**: System MUST validate updated fields with the same rules as creation; exit code 1
  on violation; stderr MUST contain the offending field name and constraint.
- **FR-018a**: System MUST reject an `update` invocation that supplies none of `--title`,
  `--description`, or `--priority` with exit code 1; stderr MUST contain `"at least one"` or
  `"--title"`.

#### Task Deletion

- **FR-019**: System MUST accept a `delete <id>` command that permanently removes the task
  and prints a one-line confirmation to stdout.
- **FR-019a**: When `delete` is invoked with `--json`, the CLI MUST output the full task object
  (same shape as `show --json`) representing the task as it existed immediately before
  deletion.
- **FR-020**: System MUST exit with code 2 when `delete` is called with an ID that does not
  exist; stderr MUST contain the ID and `"not found"`.

#### Tagging

- **FR-021**: System MUST accept a `tag <id> <tag>` command that adds a lowercase tag to the
  identified task and prints a one-line confirmation to stdout.
- **FR-022**: System MUST accept an `untag <id> <tag>` command that removes a tag from the
  identified task and prints a one-line confirmation to stdout.
- **FR-023**: System MUST enforce that tag values consist of lowercase letters (`a-z`), digits
  (`0-9`), and hyphens (`-`) only; tags MUST NOT be empty; tags MUST NOT contain uppercase
  letters, spaces, or other symbols; violations exit with code 1 and stderr MUST contain
  `"lowercase"`.
- **FR-024**: System MUST enforce a maximum of 10 unique tags per task; a request to add an
  11th tag MUST exit with code 1; stderr MUST contain `"10"` and `"tag"`.
- **FR-025**: System MUST de-duplicate tags; adding a tag that already exists on a task MUST
  be a no-op (exit code 0); the CLI prints a one-line confirmation indicating no change was
  needed.
- **FR-025a**: System MUST treat `untag` called with a tag that does not exist on the task as
  a no-op (exit code 0); the CLI prints a one-line confirmation indicating no change was
  needed.
- **FR-025b**: Duplicate `--tag` values supplied in a single `add` invocation MUST be silently
  deduplicated; the task is created with one copy of the tag and the exit code is 0.
- **FR-026**: System MUST exit with code 2 for `tag`/`untag` calls referencing a non-existent
  task ID; stderr MUST contain the ID and `"not found"`.

#### Status Management

- **FR-027**: System MUST accept a `status <id> <new-status>` command.
- **FR-028**: System MUST permit the following status transitions only:
  - `todo` → `in_progress`
  - `in_progress` → `done`
  - `in_progress` → `todo`
- **FR-029**: System MUST reject any other status transition with exit code 1; stderr MUST
  contain `"invalid transition"`, the current status, and the requested status.
- **FR-030**: System MUST treat a `status` command that requests the task's current status as
  a no-op (exit code 0); the CLI prints a one-line confirmation indicating no change was
  needed.

#### Output Format

- **FR-031**: Only the `list` and `show` commands produce human-readable tabular output. All
  other commands MUST print a single one-line confirmation message to stdout on success.
- **FR-032**: All commands MUST support a `--json` flag; when set, output MUST be valid JSON
  written to stdout.
- **FR-032a**: JSON output MUST use `snake_case` field names matching the Key Entities
  definition exactly: `id`, `title`, `description`, `priority`, `tags`, `status`,
  `created_at`, `updated_at`.
- **FR-032b**: When any mutation command (`add`, `update`, `delete`, `status`, `tag`, `untag`)
  is invoked with `--json`, the CLI MUST output the resulting task object as a valid JSON
  object with snake_case field names. For `delete`, the object represents the task immediately
  before deletion. For no-op mutations (`status`, `tag`, `untag` with no state change), the
  object represents the unchanged task.
- **FR-033**: Error messages MUST be written to stderr regardless of the `--json` flag.

#### Persistence

- **FR-034**: System MUST persist the task store to a local JSON file.
- **FR-035**: The storage file path MUST default to `./tasks.json` and MUST be overridable via
  the `TODO_FILE` environment variable.
- **FR-036**: Any `TODO_FILE` value containing `..` path segments MUST be rejected with exit
  code 1; stderr MUST contain `".."` or `"invalid"`. All other storage paths MUST be resolved
  to an absolute path before any file I/O.
- **FR-037**: All writes to the storage file MUST be atomic (write to a temporary file in the
  same directory, then rename to the target path).
- **FR-038**: If the storage file does not exist when any read command is first issued, the
  system MUST treat the store as empty and create the file on the next write.
- **FR-039**: If the storage file exists but contains invalid JSON or an unexpected schema,
  the system MUST exit with code 3; stderr MUST contain the file path; the file MUST NOT be
  overwritten or corrupted.

#### Input Validation

- **FR-044**: System MUST reject any command that takes an `<id>` argument when the value is
  non-numeric or less than or equal to zero; exit code is 1; stderr MUST contain `"id"` or
  `"integer"` for non-numeric values, and `"id"` or `"positive"` for non-positive values.

#### Exit Codes

- **FR-040**: System MUST exit with code 0 on every successful operation.
- **FR-041**: System MUST exit with code 1 on input validation errors (invalid field values,
  invalid status transitions, constraint violations, invalid ID format, path traversal).
- **FR-042**: System MUST exit with code 2 when a referenced task ID is not found.
- **FR-043**: System MUST exit with code 3 on storage I/O errors (read failure, write failure,
  corrupt file, schema mismatch, missing parent directory).

### Key Entities *(include if feature involves data)*

- **Task**: The core unit of work. Attributes: `id` (unique integer, auto-assigned from
  `nextId`), `title` (string, 1–120 chars, required), `description` (string, optional),
  `priority` (`low` | `medium` | `high`, default `medium`), `tags` (array of unique lowercase
  strings, max 10), `status` (`todo` | `in_progress` | `done`), `created_at` (ISO 8601 UTC),
  `updated_at` (ISO 8601 UTC).

- **Task Store**: The persisted collection of tasks. Represented as a JSON file containing
  an object `{ "nextId": <int>, "tasks": <array of Task objects> }` where `nextId` is the
  next integer ID to be assigned and is never decremented after deletion. The file path is
  configurable via `TODO_FILE`. Any file that does not match this exact top-level schema
  structure MUST be treated as corrupt (FR-039).

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
  task's ID is retired); the `nextId` counter in the store guarantees this.
- The `TODO_FILE` environment variable, when set, is trusted as a valid filesystem path subject
  to FR-036 path-traversal validation.
- Tags are compared case-sensitively after the lowercase constraint is applied; `work` and
  `Work` are treated as a validation error (not auto-lowercased).
- The human-readable table format for `list` and `show` is not formally specified beyond the
  requirement that all task fields are visible; column names and widths may vary.
- The `add` command outputs the created task's ID in the success message; the exact wording is
  left to implementation, but the ID MUST be present.
- Clearing a description by supplying `--description ""` on `update` is a valid operation
  (description has no minimum length); the field is set to an empty string (the data model
  default is `""`, not null).

## Clarifications

### Session 2026-11-14

- Q: What field naming convention should the `--json` output use for all commands? → A: snake_case (`created_at`, `updated_at`, matching the Key Entities definition).
- Q: When `untag` is called with a tag that does not currently exist on the task, what should the CLI do? → A: No-op, exit code 0 (symmetric with tag deduplication rule in FR-025).
- Q: When `add` is called with duplicate `--tag` values in the same command, what should happen? → A: Silently deduplicate; task created with one copy of the tag, exit code 0 (FR-025b).
- Q: When `update` is called with no option flags at all, what should the CLI do? → A: Validation error, exit code 1; message must indicate at least one option is required (FR-018a).
- Q: What JSON structure should the `delete` command output when called with `--json`? → A: Full deleted task object (same shape as `show --json`) representing the task before deletion (FR-019a).

### Session 2026-11-14 (review)

- All acceptance scenarios assigned stable IDs AC-001–AC-051; each lists the FR IDs it covers.
- Error messages made testable: every error scenario now specifies stderr `"must contain"` keywords or phrases.
- Store format updated to `{ "nextId": <int>, "tasks": [...] }`; FR-005 and Task Store entity updated.
- FR-025 `"silently"` removed to agree with AC-020: the CLI prints a one-line confirmation even on a no-op tag operation.
- FR-031 updated: only `list` and `show` produce tables; all other commands print a one-line confirmation.
- FR-036 updated: `TODO_FILE` values containing `..` path segments rejected with exit code 1.
- FR-010 updated: three-level sort (priority desc → created_at asc → id asc) for deterministic ordering per AC-045.
- FR-032b added: JSON output for all mutation commands returns the resulting task object.
- FR-044 added: non-numeric or non-positive task ID → exit code 1.
- User Story 7 added with AC-031–AC-051 covering persistence errors, validation edge cases, and mutation JSON output.

### Session 2026-11-14 (gap-fill)

- AC-052 added: description field stored and visible in `show` output (FR-002 — previously uncovered).
- AC-053 added: `update` on non-existent ID → exit 2, stderr contains ID and "not found" (FR-017 — previously uncovered).
- AC-054 added: duplicate `--tag` values in a single `add` stored exactly once, verified via `show --json` (FR-025b — previously uncovered).
- AC-055 added: both `tag` and `untag` on non-existent task ID → exit 2, stderr contains ID and "not found" (FR-026 — previously uncovered).
- AC-056 added: after any successful write, no temp file remains and tasks.json is valid parseable JSON with the expected schema (FR-037 — previously uncovered).
- AC-057 added: add 3 tasks, delete id=3, add again → new id is 4, not 3; id=3 returns exit 2 (FR-005 never-reuse property, extending AC-001).

### Session 2026-11-15 (speckit-analyze remediation)

- AC-058 added: `tag` no-op + `--json` → valid JSON object returned (FR-025, FR-032b — no-op path previously untested with `--json`).
- AC-059 added: `untag` no-op + `--json` → valid JSON object returned (FR-025a, FR-032b — no-op path previously untested with `--json`).
- AC-060 added: `status` no-op + `--json` → valid JSON object returned (FR-030, FR-032b — no-op path previously untested with `--json`).
- AC-061 added: `list --json` on empty store → `[]` empty JSON array (FR-009, FR-012, FR-032 — empty store + `--json` combination was untested).
- AC-062 added: `add` with exactly 10 distinct tags → success, exit 0 (FR-004, FR-024 — upper boundary was untested; only the 11-tag failure was covered).
- AC-063 added: `update --description "" --json` → `"description": ""` in JSON output (FR-002, FR-015 — clearing description was noted in Assumptions but had no AC).
- Assumptions: "or null" removed from description-clearing note; description is always set to empty string per data-model default of `""`.
