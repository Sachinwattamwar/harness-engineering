# Part 1B — Natural-Language Reminder Agent

A CLI that parses a natural-language reminder request and returns a structured JSON object
conforming to the `reminder-output/v1` schema. Built with Spec-Driven Development as part of
AI-Augmented SDLC (BITS SEZG534 Assignment 1).

---

## Setup

**Prerequisites:** Node.js ≥ 22, an OpenAI API key.

```zsh
# 1. Install dependencies
npm install

# 2. Create .env from the example
cp .env.example .env

# 3. Edit .env — set your OpenAI API key
#    OPENAI_API_KEY=sk-...
```

`.env.example` documents all required variables:

| Variable | Description |
|----------|-------------|
| `LLM_PROVIDER` | Adapter to use — `openai` (default). `stub` is for integration tests only; eval refuses it. |
| `LLM_MODEL` | Model name passed to the OpenAI API — default `gpt-4o-mini` |
| `OPENAI_API_KEY` | Your OpenAI secret key — required when `LLM_PROVIDER=openai` |

---

## Running the CLI

```zsh
node bin/remind.js --now "2026-11-15T09:00:00+05:30" --timezone "Asia/Kolkata" \
  "Remind me to call the dentist at 3pm tomorrow"
```

**Options:**

| Flag | Description |
|------|-------------|
| `--now <ISO>` | Reference datetime with explicit UTC offset (e.g. `2026-11-15T09:00:00+05:30`) |
| `--timezone <tz>` | IANA timezone string (default: `Asia/Kolkata`) |
| `<text>` | Natural-language reminder request (1–2000 characters) |

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Success — JSON output on stdout |
| `1` | Pre-flight error (bad `--now`, invalid timezone, text too long) or schema validation failure |
| `4` | Adapter error — LLM endpoint unreachable, timeout, or persistent HTTP error |

---

## npm Scripts

| Script | What it does |
|--------|-------------|
| `npm test` | Runs the full Vitest suite (77 tests) |
| `npm run lint` | ESLint — 0 errors expected; 8 accepted warnings |
| `npm run security` | Semgrep 0 blocking findings + `npm audit --omit=dev` 0 vulnerabilities |
| `npm run harness` | Sequential gate: lint → security → test; exits 1 on first failure |
| `npm run eval` | 3-layer eval pipeline — requires `LLM_PROVIDER=openai` and a valid key; makes ~78 real API calls |

---

## Reading eval results

After `npm run eval`, two output files are written:

### `evidence/eval-results.json`

Top-level summary of the most recent eval run. Key fields:

| Field | Meaning |
|-------|---------|
| `runId` | Sequential run number |
| `aggregateScore` | Weighted score across all cases (threshold ≥ 0.85) |
| `result` | `"PASS"` or `"FAIL"` |
| `guardrailPass` | `true` if all 4 adversarial cases score 1.0 (SC-002) |
| `layer1AllPass` | `true` if all outputs are schema-valid |
| `cases[].caseId` | Dataset case identifier (e.g. `"AC-001"`) |
| `cases[].meanScore` | Average score across 3 runs (0–1) |
| `cases[].weight` | 3 for guardrail cases, 2 for all others |
| `cases[].runScores` | Per-run scores `[s1, s2, s3]` |

### `evidence/eval-runs/run-N-<timestamp>.json`

Full per-case, per-run detail including layer 1/2/3 results for every invocation.

### Thresholds (declared in spec before eval)

| Criterion | Threshold | Spec ref |
|-----------|-----------|---------|
| L1 — schema validity | 100% | SC-001 |
| L2 — guardrail cases | mean = 1.0 per case | SC-002 |
| Aggregate weighted score | ≥ 0.85 | SC-003 |

---

## Evidence

| Path | Contents |
|------|----------|
| `evidence/harness-log.md` | Human-readable log of all harness runs, eval runs, corrections, and human review |
| `evidence/harness-results/` | Raw harness run JSON files |
| `evidence/eval-results.json` | Latest eval summary |
| `evidence/eval-runs/` | Per-run eval JSON files |
| `evidence/initial-generation/` | Snapshot of src/bin/prompts from first agent coding session |
| `evidence/final-generation/` | Snapshot of src/bin/prompts at end of repair cycle |
