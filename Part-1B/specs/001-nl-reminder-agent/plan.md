# Implementation Plan: NL Reminder Agent CLI

**Branch**: `001-nl-reminder-agent` | **Date**: 2026-11-15 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-nl-reminder-agent/spec.md`

## Summary

A stateless Node.js 22+ CLI that accepts a free-text natural-language reminder request plus a
reference datetime and IANA timezone, calls an LLM through a provider-adapter layer, and returns
a schema-validated JSON output conforming to `reminder-output/v1`. The technical approach centres
on an OpenAI adapter (`gpt-4o-mini`, Structured Outputs API) behind an env-var-selected adapter
interface (`src/llm/`), Ajv for contract enforcement at Layer 1, Luxon for timezone-aware date
resolution, and a three-layer eval harness in `.harness/` that separates infrastructure ERRORs
(exit 4) from application FAILs (exit 1). All eval thresholds are declared in the spec and may
not be lowered after the first run.

## Technical Context

**Language/Version**: Node.js 22+, ES modules (`"type": "module"` in package.json), plain JavaScript

**Primary Dependencies**:
- `openai` — official OpenAI SDK; `response_format: json_schema` for Structured Outputs
- `ajv` + `ajv-formats` — JSON Schema v7 validation; enforces `reminder-output/v1`
- `luxon` — timezone-aware datetime parsing and relative-date resolution (IANA zone support)
- `dotenv` — load secrets from `.env` into `process.env` at startup
- `commander` — CLI argument and option parsing (`<text>`, `--now`, `--timezone`)
- `vitest` + `@vitest/coverage-v8` — unit/integration tests; ≥85% line coverage
- `eslint` + `eslint-plugin-security` — static analysis; 0 errors required
- `semgrep` — SAST; 0 findings required (via npm script)

**Storage**: None (stateless); eval harness writes required `evidence/eval-results.json` (latest run, overwritten) and `evidence/eval-runs/run-<n>-<timestamp>.json` (per-run copies, never deleted); optionally appends to `eval-results.jsonl` as a convenience log

**Testing**: Vitest with `@vitest/coverage-v8`; LLM adapter mocked in all unit and integration
tests; CLI subprocess tests via Node.js `child_process` for end-to-end exit-code coverage;
≥85% line coverage over all `src/` and `bin/` files

**Target Platform**: macOS/Linux command-line (Node.js 22+ runtime)

**Project Type**: CLI

**Performance Goals**: LLM call timeout 30 s; exponential backoff with 2 retries (3 total
attempts); per-call latency otherwise unbounded (network-dependent)

**Constraints**: All outputs schema-valid (`additionalProperties: false`); LLM provider swappable
via env vars only; secrets never logged, printed, or committed; no placeholder source files in
`src/` or `bin/`

**Scale/Scope**: Single CLI invocation per run; eval harness: ~24 eval cases × 3 runs each per
eval execution

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Requirement | Status |
|---|---|---|
| I. Output Contract | Ajv validates every LLM output against `reminder-output/v1`; schema `$id` = version token | ✅ Covered — Ajv selected; schema defined in spec and contracts/ |
| II. Traceability | Every eval case maps to ≥1 INV/PROP/GR or FR/AC ID | ✅ Covered — 24 ACs fully mapped in spec table; all 21 FRs, 11 INVs, 10 PROPs, 6 GRs, 4 SEMs assigned |
| III. Evaluation Standards | Thresholds declared (100%/100%/85%); 3 runs at temp 0; flaky cases reported and included | ✅ Covered — declared in spec §Evaluation Framework; MUST NOT be lowered |
| IV. Error Classification | Exit 4 for ERROR; exit 1 for FAIL; 2 retries with exponential backoff; ERROR excluded from scoring | ✅ Covered — FR-013, FR-020, PROP-007, INV-010; AdapterError type in design |
| V. Provider Abstraction | `src/llm/` adapter; `LLM_PROVIDER`+`LLM_MODEL` env vars; metadata (provider, model, temp, prompt version) recorded per run | ✅ Covered — ProviderAdapter interface in data-model; eval run records include all metadata |
| VI. Secret Hygiene | `dotenv` loads `.env` at startup; never log/print/commit secrets; no `.env` file reads in business or test code | ✅ Covered — dotenv chosen; assumption documented in spec |
| VII. Quality Gates | ESLint 0 errors; Semgrep 0 findings; npm audit 0 high/critical; Vitest 100% pass ≥85% cov; no placeholder files | ✅ Covered — npm scripts: lint, security, test, harness |
| VIII. Agent Rules | Eval thresholds immutable after first run; no test suppression; no eslint-disable without justification | ✅ Covered — declared in spec; enforced by constitution |
| IX. Harness Independence | Tests/eval cases derived from spec IDs, not from code paths; no internal imports beyond public API | ✅ Covered — eval cases map to AC-xxx spec IDs; harness in `.harness/` separate from `src/` |

**Gate result**: PASS. No violations. Proceeding to Phase 0 and Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/001-nl-reminder-agent/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── cli-interface.md
│   ├── output-schema.json
│   ├── eval-dataset-schema.json
│   └── eval-result-schema.json
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
bin/
└── remind.js            # CLI entry point: commander setup, pre-flight validation, orchestration

src/
├── agent.js             # Orchestration: pre-flight → adapter call → Ajv validate → return output
├── llm/
│   ├── adapter.js       # Provider adapter factory (createAdapter) + AdapterError class; LLM_PROVIDER=stub → StubAdapter
│   ├── openai.js        # OpenAI adapter: chat.completions.create, Structured Outputs, retry logic
│   └── stub.js          # StubAdapter: returns STUB_RESPONSE env var or evals/fixtures/stub-response.json; no network; for integration tests only
├── schema/
│   └── validator.js     # Ajv setup; compiles and exports reminder-output/v1 validate function
└── dates/
    └── resolver.js      # Luxon-based relative date resolution, IANA timezone validation

prompts/
└── v1.txt               # Versioned system prompt

evals/
└── fixtures/
    └── stub-response.json  # Default canned output for StubAdapter when STUB_RESPONSE env var absent

tests/
├── unit/
│   ├── agent.test.js            # Orchestration logic, exit-code routing (adapter mocked)
│   ├── dates/resolver.test.js   # Relative date resolution, IANA validation, next-weekday logic
│   ├── llm/openai.test.js       # Retry logic, error classification (network mocked)
│   └── schema/validator.test.js # Ajv validation: valid/invalid/extra-field cases
└── integration/
    └── cli.test.js              # Subprocess invocations of bin/remind.js; exit codes; stdout/stderr

evals/
└── dataset.json         # Eval cases derived from spec ACs (24 cases, eval-dataset/v1 schema)

.harness/
├── schema-validator.js   # Layer 1: Ajv validation of CLI output
├── invariant-checker.js  # Layer 2: INV-xxx, PROP-xxx, GR-xxx assertion checks
├── semantic-evaluator.js # Layer 3: SEM-xxx rule-based quality checks (keyword matching, stemming)
├── run-eval.js           # Eval runner: 3 runs/case, ERROR/FAIL/PASS classification, scoring
└── run-harness.js        # Harness gate: invokes lint → security → test; exits 1 on any failure

evidence/
├── eval-results.json     # Latest run: full summary + per-case results (overwritten each run)
└── eval-runs/            # Per-run copies: run-<n>-<timestamp>.json (never deleted)
```

**Structure Decision**: Single project (Node.js monorepo, no frontend). The CLI, adapter layer,
schema validation, date resolution, and eval harness are co-located. The `.harness/` directory
is a sibling to `src/` and `tests/`, keeping eval infrastructure independent of application code
as required by Principle IX. All application code lives in `src/` and `bin/`; the eval harness
in `.harness/` imports only the public module API (`src/agent.js`) and the CLI via subprocess.
