# Final Generation Snapshot

Snapshot of `src/`, `bin/`, and `prompts/` as of the end of the Part 1B repair cycle
(eval run 2 complete; harness runs 1–9 all recorded in `evidence/harness-log.md`).

---

## What changed from initial-generation

| File | Change |
|------|--------|
| `src/schema/validator.js` | Removed `allErrors: true` from Ajv constructor — Semgrep `ajv-allerrors-true` finding fixed in Run 3 |
| `src/llm/openai.js` | Removed `process.env.VITEST ? 0 : 1000` guard from `RETRY_BASE_MS` — fake timers used in tests instead (Run 8) |
| `src/agent.js` | Switched prompt path from `v1.txt` → `v2.txt`; `PROMPT_VERSION = "v2"`; added weekday name injection into user message (`referenceNow: ... (Sunday)`) |
| `prompts/v2.txt` | New file — 7 targeted changes over v1: FR-010 disambiguation, PROP-002 midnight rule, PROP-010 weekday worked example, FR-007/INV-006 clarify prohibitions, snooze scope narrowed, SEM-003 exact-phrase fix |
| `prompts/v1.txt` | Unchanged — preserved for reference |

`src/llm/adapter.test.js` is **not** included in this snapshot: test files are not implementation
artefacts. The file remains in `src/llm/adapter.test.js` in the working tree.

---

## Files in this snapshot

| File | Implements |
|------|-----------|
| `src/schema/validator.js` | T017 — Ajv v8 validator; `validate(json)` → `{ valid, errors }` |
| `src/dates/resolver.js` | T018 — Luxon-based `validateTimezone`, `resolveRelativeDate`, `isInFuture` |
| `src/llm/adapter.js` | T019 — `createAdapter()` routing by `LLM_PROVIDER`; re-exports `AdapterError` |
| `src/llm/openai.js` | T020 — `OpenAIAdapter`; 3-attempt exponential backoff (1 s, 2 s); `AbortSignal.timeout(30 s)` |
| `src/llm/stub.js` | T019 — `StubAdapter` for integration tests; reads `STUB_RESPONSE` or fixture file |
| `src/agent.js` | T021 — `run()`; pre-flight validation; weekday injection; adapter call; Ajv output validation |
| `bin/remind.js` | T022 — Commander CLI; exit codes 0 / 1 (pre-flight) / 4 (adapter) |
| `prompts/v1.txt` | T016/T027/T032/T036/T041 — original system prompt |
| `prompts/v2.txt` | Repair cycle — revised prompt used in eval run 2 |

---

## Harness state at time of snapshot

| Run | Date | Gates | Result |
|-----|------|-------|--------|
| Run 1 | 2026-11-16 | lint ✅ security ✅ test ❌ (18/61 stubs) | FAIL — baseline |
| Run 2 | 2026-11-20 | lint ✅ security ❌ (allErrors) test — | FAIL |
| Run 3 | 2026-11-20 | lint ✅ security ✅ test ❌ | FAIL |
| Runs 4–8 | 2026-11-20–21 | lint ✅ security ✅ test ❌ (Vitest Errors) | FAIL |
| Run 9 | 2026-11-21 | lint ✅ security ✅ test ✅ (77/77) | **PASS** |

Eval run 1 (2026-11-23): aggregate 0.524 — FAIL
Eval run 2 (2026-11-23): aggregate 0.762 — FAIL (improvement; guardrail 4/4 PASS)
