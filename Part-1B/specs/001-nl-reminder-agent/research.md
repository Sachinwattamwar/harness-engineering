# Research: NL Reminder Agent CLI

**Phase**: 0 (Pre-Design) | **Date**: 2026-11-15 | **Plan**: [plan.md](plan.md)

All unknowns from the Technical Context are resolved below. No NEEDS CLARIFICATION items remain.

---

## 1. OpenAI Structured JSON Output

**Decision**: Use OpenAI's `response_format: { type: "json_schema", json_schema: { ... } }` (Structured Outputs API, available on `gpt-4o-mini` and `gpt-4o`).

**Rationale**: The Structured Outputs API (released 2024) guarantees that the model's response conforms to a supplied JSON Schema — it refuses to produce tokens that would violate the schema. This is strictly stronger than the older `response_format: { type: "json_object" }` JSON mode, which only guarantees valid JSON but not schema conformance. Because `reminder-output/v1` has an `additionalProperties: false` contract, Structured Outputs removes an entire class of INV-001/INV-009 failures.

**How to use**:
```js
const response = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  temperature: 0,
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "reminder_output",
      strict: true,
      schema: { /* reminder-output/v1 properties */ }
    }
  },
  messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userText }]
});
```

**Alternatives considered**:
- `json_object` mode: Does not enforce field presence or enum constraints. Rejected — still needs Ajv pass-through, but higher failure rate.
- Function calling / tool use: Equivalent to Structured Outputs for JSON extraction but requires wrapping schema as a tool parameter. More verbose with no benefit here.

**Note**: Even with Structured Outputs, Ajv validation (Layer 1) is still mandatory per Principle I — the JSON Schema adapter guarantees from the API are not a substitute for the harness's own verification.

---

## 2. Ajv v8 for JSON Schema Draft-07

**Decision**: Use `ajv@^8` with the `ajv-formats` add-on. Configure with `{ strict: false, allErrors: true }`.

**Rationale**: Ajv v8 defaults to JSON Schema draft-2020-12 and throws on unknown keywords in draft-07. Using `strict: false` suppresses these warnings while keeping full draft-07 semantics. The `reminder-output/v1` schema uses `$schema: "http://json-schema.org/draft-07/schema#"`, which is draft-07.

**Setup**:
```js
import Ajv from "ajv";
import addFormats from "ajv-formats";
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const validate = ajv.compile(reminderOutputV1Schema);
```

**Alternatives considered**:
- `ajv@^6` (draft-07 native): Older, no longer maintained. Rejected.
- `@hyperjump/json-schema` (draft-07 compliant): Good, but Ajv is the ecosystem standard for Node.js validation.

---

## 3. Luxon Relative Date Resolution

**Decision**: Use `luxon@^3`. Parse `referenceNow` with `DateTime.fromISO(str, { setZone: true })` to preserve the supplied UTC offset. Resolve the target datetime in the named IANA timezone using `DateTime.fromISO(str).setZone(ianaTimezone)`.

**Key operations**:
- Parse reference now: `DateTime.fromISO(referenceNow, { setZone: true })`
- Apply IANA timezone: `.setZone("Asia/Kolkata")`
- Relative resolution: `.plus({ hours: 2 })`, `.plus({ days: 1 }).set({ hour: 15, minute: 0, second: 0 })`
- Next weekday (PROP-010): iterate forward from reference date until `weekday === targetWeekday`; always at least 1 day ahead
- Validate IANA timezone: `DateTime.now().setZone(tz).isValid` — if `false`, zone is invalid
- Format output: `.toISO()` (includes UTC offset)
- Past-due check: `dueDateTime <= referenceDateTime`

**Alternatives considered**:
- `date-fns-tz`: Good but more verbose for IANA zone handling; Luxon has built-in IANA support via the Intl API.
- `dayjs` with `timezone` plugin: Requires plugin chain; Luxon is self-contained.

---

## 4. Vitest CLI Subprocess Coverage

**Decision**: Use `vitest` with `@vitest/coverage-v8`. For CLI subprocess tests, spawn `bin/remind.js` as a child process via Node.js `child_process.spawnSync` or `spawn`. Use `--coverage` flag with `include: ["src/**", "bin/**"]` in `vitest.config.js`.

**Coverage of subprocess code**: V8's built-in coverage (`NODE_V8_COVERAGE`) cannot collect coverage from subprocess invocations. Work around: instrument via `c8` environment variable `NODE_V8_COVERAGE=./coverage-tmp` when spawning the subprocess, then merge reports. Alternatively, also test `bin/remind.js` logic via direct imports in unit tests (the `bin/` entry point should be thin — only commander setup and a call to `src/agent.js`), making subprocess tests serve as integration smoke tests while unit tests provide the coverage signal.

**Recommended approach**:
1. Keep `bin/remind.js` thin (< 20 lines): parse args, call `agent.run()`, handle exit codes.
2. Unit-test `src/agent.js` directly — this is where coverage is earned.
3. Use subprocess tests in `tests/integration/cli.test.js` to verify exit codes and stdout/stderr shapes.
4. Set Vitest coverage `include` to `["src/**/*.js", "bin/**/*.js"]`.

**Alternatives considered**:
- `execa` for subprocess spawning: Ergonomic async API; can be added if the team prefers it. Not strictly needed with `child_process`.
- Istanbul/nyc: Legacy; `@vitest/coverage-v8` is the native Vitest choice.

---

## 5. ESLint v9 Flat Config + eslint-plugin-security

**Decision**: Use ESLint v9 with flat config (`eslint.config.js`). Use `eslint-plugin-security` for security-specific rules.

**Setup**:
```js
// eslint.config.js
import js from "@eslint/js";
import security from "eslint-plugin-security";

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    rules: {
      "no-console": "warn",
    }
  }
];
```

**Key rules from eslint-plugin-security**:
- `security/detect-non-literal-fs-filename` — flags dynamic path construction
- `security/detect-object-injection` — flags bracket-notation property access with dynamic keys
- `security/detect-possible-timing-attacks` — flags string comparisons that may be timing-unsafe

**Alternatives considered**:
- ESLint v8 `.eslintrc.js`: Still supported but deprecated. Using v9 flat config to stay current.
- `eslint-plugin-node` / `eslint-plugin-n`: Useful for Node.js-specific rules; can be added, not required by constitution.

---

## 6. Commander v12 CLI Design

**Decision**: Use `commander@^12`. Define a single command with positional argument for `<text>` and options `--now <iso>` and `--timezone <iana>`.

**CLI interface**:
```
remind <text> --now <ISO-8601-with-offset> [--timezone <IANA>]
```

**Exit code mapping** (INV-010):
- `0`: Successful structured output
- `1`: Pre-flight validation failure or application/schema validation failure
- `4`: Model/service error (after retries exhausted)

Commander handles `--help` and `--version` automatically; both are exit 0.

**Alternatives considered**:
- `yargs`: More feature-rich but heavier; commander is sufficient for a single-command CLI.
- `minimist`: No built-in validation or help generation.

---

## 7. Provider Adapter Interface Pattern

**Decision**: Define the adapter as a plain object/class with a single async method `call(messages, options)`. The factory function `createAdapter(provider, model)` reads `LLM_PROVIDER` and `LLM_MODEL` env vars and returns the matching adapter instance.

**Interface**:
```js
// src/llm/adapter.js
export function createAdapter() {
  const provider = process.env.LLM_PROVIDER ?? "openai";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
  if (provider === "openai") return new OpenAIAdapter(model);
  throw new Error(`Unknown LLM provider: ${provider}`);
}

// Adapter contract:
// adapter.call(systemPrompt, userPrompt) → Promise<{ output: ReminderOutput, meta: {...} }>
// Throws AdapterError (classified as ERROR) on service failure after retries.
```

**Metadata returned with every call** (Principle V): `{ provider, model, temperature, promptVersion }`.

**Alternatives considered**:
- Dependency-injection container: Overkill for two adapters. Plain factory function is simpler.
- Dynamic `import()` per provider: Avoids loading unused adapters, but adds async complexity for a CLI that only uses one adapter per invocation.

---

## 8. Exponential Backoff Retry

**Decision**: Implement inline in `src/llm/openai.js`. Use a `for` loop with 3 iterations max (1 initial + 2 retries). Backoff: `delay = baseDelay * 2^attempt` where `baseDelay = 1000 ms`.

**Retry-eligible conditions**: timeout (30s), HTTP 429, HTTP 5xx, `ECONNREFUSED`, `ENOTFOUND`, unknown model error.

**Non-retry conditions**: HTTP 400 (bad request / schema mismatch from API) — these are application-level errors (exit 1, not exit 4).

**Implementation sketch**:
```js
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 1000;
for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
  try {
    return await callOnce(messages, options);
  } catch (err) {
    if (!isRetryable(err) || attempt === MAX_ATTEMPTS - 1) throw new AdapterError(err);
    await sleep(BASE_DELAY_MS * 2 ** attempt);
  }
}
```

**Alternatives considered**:
- `p-retry` / `async-retry`: Clean abstraction, but adds a dependency for logic that fits in ~15 lines.
- Polling / circuit breaker: Out of scope for v1; exponential backoff is sufficient.

---

## 9. Eval Harness Three-Layer Pipeline

**Decision**: Implement as three separate modules in `.harness/`, each invoked sequentially by `run-eval.js`.

**Pipeline**:
```
dataset.json
  → for each case × 3 runs:
      1. spawn CLI (bin/remind.js) with case input
      2. schema-validator.js (Layer 1) → pass/fail
      3. invariant-checker.js (Layer 2) → INV/PROP/GR checks → per-ID pass/fail
      4. semantic-evaluator.js (Layer 3) → SEM checks → fraction ≥ 0.75
      5. classify: ERROR (exit 4) | FAIL | PASS
  → aggregate weighted score
  → compare to thresholds (100%/100%/85%)
  → write evidence/eval-results.json (full summary + per-case results; overwrite)
  → write evidence/eval-runs/run-<n>-<timestamp>.json (identical per-run copy; never deleted)
  → optionally append to eval-results.jsonl (additional log; not a substitute for the above)
  → exit 0 (PASS) or exit 1 (FAIL)
```

**ERROR vs FAIL separation**: If the CLI exits with code 4, the case run is classified as ERROR and placed in a separate bucket. ERROR runs do not affect pass rates or aggregate score.

**Flaky detection**: After 3 runs, compare `intent`, `priority`, `due` (±1 min), `title` (SEM-001) across runs. Any disagreement → mark case as flaky; still include at mean score.

**Alternatives considered**:
- Single monolithic eval script: Harder to test and debug individual layers.
- Jest-based eval: Vitest is already the project standard; using it for eval would blur the harness-independence boundary (Principle IX). The eval harness runs as a plain Node.js script, not as a test suite.
