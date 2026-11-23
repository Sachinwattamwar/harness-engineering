# Data Model: NL Reminder Agent CLI

**Phase**: 1 (Design) | **Date**: 2026-11-15 | **Plan**: [plan.md](plan.md)

---

## Entities

### 1. ReminderRequest

The unit of evaluation input. Represents a single CLI invocation's inputs after pre-flight validation.

| Field          | Type    | Constraints                                            | Source         |
|----------------|---------|--------------------------------------------------------|----------------|
| `text`         | string  | 1–2000 characters; non-empty after trim                | CLI positional arg |
| `referenceNow` | string  | ISO-8601 datetime with explicit UTC offset (e.g. `+05:30` or `Z`); required | `--now` option |
| `timezone`     | string  | Valid IANA timezone string (e.g. `"Asia/Kolkata"`); defaults to `"Asia/Kolkata"` | `--timezone` option |

**Validation rules**:
- `text`: reject if empty/whitespace → `intent=clarify`; reject if > 2000 chars → exit 1 (FR-016)
- `referenceNow`: reject if missing or not valid ISO-8601 with explicit offset → exit 1 (FR-017)
- `timezone`: reject if not a valid IANA zone string → exit 1 (FR-018); default `"Asia/Kolkata"` if not supplied

**State transitions**: ReminderRequest is immutable once created by the CLI parser. It is passed as-is to the agent orchestration layer.

---

### 2. ReminderOutput

The unit of evaluation output. Produced by the LLM via the provider adapter and validated against `reminder-output/v1`.

| Field                   | Type            | Constraints                                                       |
|-------------------------|-----------------|-------------------------------------------------------------------|
| `intent`                | string (enum)   | One of: `create \| reschedule \| snooze \| clarify \| refuse`       |
| `title`                 | string \| null  | Non-null, non-empty when `intent=create`; best-effort for reschedule/snooze; null for clarify/refuse |
| `due`                   | string \| null  | ISO-8601 with explicit UTC offset when non-null; null for `clarify`; null for `refuse` |
| `priority`              | string (enum)   | One of: `low \| medium \| high`; defaults to `"medium"` when no signal |
| `tags`                  | string[]        | Array of non-empty strings; may be empty; topically relevant (SEM-004) |
| `clarification_question`| string \| null  | Non-null, non-empty when `intent=clarify`; null otherwise          |
| `refusal_reason`        | string \| null  | Non-null, non-empty when `intent=refuse`; null otherwise           |

**Validation**: Ajv against `reminder-output/v1` JSON Schema (`additionalProperties: false`). Failure → exit 1.

**Intent-conditional constraints**:
- `create`: `title` non-null, `due` non-null and strictly after `referenceNow`, `clarification_question` null, `refusal_reason` null
- `clarify`: `clarification_question` non-null, `due` null
- `refuse`: `refusal_reason` non-null, `title` null, `due` null, `clarification_question` null
- `reschedule` / `snooze`: `due` non-null and strictly after `referenceNow`; `title` best-effort

---

### 3. ProviderAdapter (interface)

The abstraction layer between the agent and the LLM API. No business logic lives here.

| Field/Method | Type | Description |
|---|---|---|
| `provider` | string | Resolved from `LLM_PROVIDER` env var (e.g. `"openai"`) |
| `model` | string | Resolved from `LLM_MODEL` env var (e.g. `"gpt-4o-mini"`) |
| `temperature` | number | Always 0 |
| `promptVersion` | string | Version string of the active prompt file (e.g. `"v1"`) |
| `call(systemPrompt, userContent)` | async function | Returns `ReminderOutput`; throws `AdapterError` on service failure |

**AdapterError**: Thrown when the service is unreachable, times out (> 30 s), returns HTTP 429 or 5xx, or returns an unrecognised model error. Triggers retry with exponential backoff (up to 2 retries). After exhausting retries → caller exits with code 4.

**OpenAIAdapter** (concrete implementation):
- Uses the official `openai` npm package
- Calls `openai.chat.completions.create()` with `response_format: { type: "json_schema", ... }`
- Returns the parsed JSON object (pre-validated by Structured Outputs; still verified by Ajv)

**StubAdapter** (test-double implementation — `LLM_PROVIDER=stub`):
- Returns the parsed JSON from `STUB_RESPONSE` env var (a JSON string), or falls back to `evals/fixtures/stub-response.json`
- Makes no network calls; always succeeds synchronously (no retry logic)
- For integration tests ONLY — the eval harness refuses to run when `LLM_PROVIDER=stub` (FR-022)

---

### 4. EvalCase

A named, versioned test case entry in `evals/dataset.json`. Derived from spec acceptance criteria.

| Field | Type | Constraints |
|---|---|---|
| `id` | string | Unique; matches AC-xxx identifier from spec (e.g. `"AC-001"`) |
| `description` | string | Human-readable scenario name |
| `input` | object | `{ text, referenceNow, timezone }` — matches ReminderRequest fields |
| `assertions` | object | Declarative expected-value checks (see sub-fields below) |
| `mappedIds` | string[] | One or more INV/PROP/GR/FR/AC/SEM identifiers from spec |
| `weight` | number (derived) | Highest weight among `mappedIds`: GR=3, INV/PROP=2, FR/AC/SEM=1 |
| `expected_exit_code` | number (optional) | Expected CLI exit code for this case; defaults to 0 if absent; used by run-eval.js to distinguish expected non-zero exits (PASS) from unexpected service errors (ERROR) |

**assertions sub-fields** (all optional; eval harness checks only the ones present):

| Sub-field | Type | Meaning |
|---|---|---|
| `intent` | string | Expected `intent` value |
| `dueExact` | string | Expected `due` value (exact ISO-8601 string) |
| `dueTolerance` | number | Tolerance in seconds (default 60 for ±1 min; 300 for ±5 min) |
| `dueIsNull` | boolean | Assert `due === null` |
| `titleNonNull` | boolean | Assert `title !== null` |
| `priorityDefault` | boolean | Assert `priority === "medium"` |
| `expected_exit_code` | number | Expected CLI exit code (0, 1, or 4); default 0; run-eval.js: if actual exit = `expected_exit_code` → evaluate layers; if actual exit 4 and `expected_exit_code ≠ 4` → ERROR (excluded from scoring) |
| `semChecks` | string[] | SEM identifiers to evaluate for this case |

---

### 5. EvalRunRecord

The authoritative record of one complete eval run. Written to two required locations:
- `evidence/eval-results.json` — full summary + per-case results of the latest run (overwritten each run)
- `evidence/eval-runs/run-<n>-<timestamp>.json` — identical per-run copy (never deleted)

An additional `eval-results.jsonl` log may be appended to in the feature directory, but the two JSON files above are the primary required outputs.

| Field | Type | Description |
|---|---|---|
| `runId` | string | Monotonically increasing integer (1, 2, 3, …) or UUID |
| `timestamp` | string | ISO-8601 datetime of run start |
| `provider` | string | Active provider name |
| `model` | string | Active model name |
| `temperature` | number | Always 0 |
| `promptVersion` | string | Version of active prompt file |
| `harnessVersion` | string | Harness version string |
| `cases` | EvalCaseResult[] | Per-case results (see below) |
| `aggregateScore` | number | Weighted aggregate (0–1) |
| `result` | string | `"PASS"` or `"FAIL"` |
| `errorCount` | number | Number of ERROR-classified case runs |

---

### 6. EvalCaseResult

Per-case breakdown within an EvalRunRecord.

| Field | Type | Description |
|---|---|---|
| `caseId` | string | References EvalCase.id |
| `runScores` | number[3] | Binary pass/fail per run: `[1, 0, 1]` |
| `meanScore` | number | Arithmetic mean of `runScores` (0, 0.333, 0.667, or 1.0) |
| `weight` | number | Case weight (highest among `mappedIds`) |
| `layer1Results` | boolean[3] | Schema validation pass per run |
| `layer2Results` | object[3] | Per-run map of INV/PROP/GR ID → boolean |
| `layer3Results` | object[3] | Per-run map of SEM ID → boolean; plus `semanticScore` fraction |
| `flaky` | boolean | True if `runScores` are not all equal (and all passes or all fails) |
| `flakyFields` | string[] | Fields that disagreed across runs (e.g. `["intent", "due"]`) |
| `errorRuns` | number | Count of runs classified as ERROR (exit 4) |

---

## Relationships

```
ReminderRequest ──(1:1)──► ReminderOutput       (via agent orchestration)
ReminderRequest ──(1:1)──► ProviderAdapter.call  (via adapter factory)
EvalCase        ──(1:1)──► ReminderRequest       (input field)
EvalCase        ──(1:N)──► EvalCaseResult        (3 runs per case)
EvalRunRecord   ──(1:N)──► EvalCaseResult        (all cases in one run)
EvalRunRecord   ──appended-to──► eval-results.jsonl
```

---

## State Transitions

The agent is stateless. The only state transitions are within a single CLI invocation:

```
Pre-flight validation
  PASS → LLM call (via adapter)
            SUCCESS → Ajv validation
                        PASS → stdout JSON, exit 0
                        FAIL → stderr error, exit 1
            ERROR (retryable) → exponential backoff → retry
                        exhausted → stderr error, exit 4
  FAIL (bad input) → stderr error, exit 1
```

---

## Data Volume / Scale Assumptions

- `evals/dataset.json`: Expected 20–30 EvalCase entries (covering all 24 ACs).
- `eval-results.jsonl`: Accumulates one record per eval run; expected < 100 runs during development.
- `evidence/eval-runs/`: One JSON file per run; < 1 MB per file.
- No database or persistent storage; all state is in files within the repository.
