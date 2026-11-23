# Assignment 1 — Spec-Driven Development & Harness Engineering

**Course:** AI-Augmented SDLC (SEZG534) · **Deadline:** 15 November 2026  
**Student:** Sachin Wattamwar · **Stack:** Node.js 22+ (ES modules, plain JS)  
**Coding agent:** Claude Code (claude-sonnet-4-6) · **App model:** gpt-4o-mini (OpenAI)

---

## Overview

This repository contains two applications built end-to-end via the GitHub **Spec Kit** Spec-Driven Development(SDD) workflow, each validated by an independent harness before human acceptance.

| Part | Application | Behaviour |
|------|-------------|-----------|
| **1A** | Smart Todo CLI | Deterministic — task CRUD, tag filtering, JSON-file persistence, priority sorting, status transitions (`todo → in_progress → done`) |
| **1B** | Natural-Language Reminder Agent | Non-deterministic — converts free-text reminders to structured JSON using an LLM, with clarification and refusal guardrails |

---

## Folder Map

```
harness-engineering/            ← repo root (this file)
├── README.md
├── .gitignore
│
├── Part-1A/                    ← Smart Todo CLI
│   ├── .specify/               ← Spec Kit workflow metadata
│   │   └── memory/constitution.md  ← engineering constitution v1.2.0
│   ├── .claude/                ← harness-protection hook
│   ├── specs/001-smart-todo-cli/   ← spec, plan, tasks, contracts, checklist
│   ├── src/                    ← store.js, validate.js, format.js, loader.js
│   ├── bin/                    ← smart-todo.js entry + 8 command handlers
│   ├── tests/                  ← Vitest unit (3 files) + contract tests (10 files)
│   ├── .harness/               ← run-harness.js (lint → security → test → report)
│   └── evidence/
│       ├── initial-generation/ ← verbatim agent output before human review
│       ├── final-generation/   ← verbatim code at final PASS (Run 5)
│       ├── harness-results/    ← run-N-<timestamp>.{md,json} for all 5 runs
│       └── harness-log.md      ← human-readable run log + repair narrative + ACCEPT
│
└── Part-1B/                    ← Natural-Language Reminder Agent
    ├── .specify/               ← Spec Kit workflow metadata
    │   └── memory/constitution.md  ← engineering constitution
    ├── .claude/                ← harness-protection hook
    ├── .env.example            ← template: LLM_PROVIDER, LLM_MODEL, OPENAI_API_KEY
    ├── specs/001-nl-reminder-agent/  ← spec, plan, tasks, contracts, eval schema
    ├── src/                    ← agent.js, schema/validator.js, llm/*, dates/resolver.js
    ├── bin/                    ← remind.js Commander CLI entry
    ├── prompts/                ← v1.txt, v2.txt, v3.txt (prompt repair history)
    ├── tests/                  ← Vitest unit (5 files) + integration (1 file) = 77 tests
    ├── evals/                  ← dataset.json (26 cases, 6 categories)
    ├── .harness/               ← run-harness.js, run-eval.js, schema/invariant/semantic evaluators
    └── evidence/
        ├── initial-generation/ ← verbatim agent output before human review
        ├── final-generation/   ← src/, bin/, prompts/ at final PASS + eval ACCEPT
        ├── harness-results/    ← raw harness JSON for all 9 unit-test runs
        ├── eval-runs/          ← run-1/2/3-<timestamp>.json (gpt-4o-mini eval results)
        ├── eval-results.json   ← final aggregate eval record (run 3, score 0.881)
        └── harness-log.md      ← human-readable log: all 9 harness runs + 3 eval runs + ACCEPT
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | `brew install node` or https://nodejs.org |
| npm | 10+ | bundled with Node |
| git | any | `brew install git` |
| semgrep | any | `brew install semgrep` — required for `npm run security` in Part 1A |
| OpenAI API key | — | Required for Part 1B `npm run eval` only; set in `Part-1B/.env` |

---

## SDD Workflow Skills

Both parts use the **GitHub Spec Kit** skills installed under each part's `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `/speckit-constitution` | Generate the engineering constitution (constraints, non-negotiables) |
| `/speckit-specify` | Generate the feature specification and acceptance criteria |
| `/speckit-clarify` | Resolve ambiguities before implementation |
| `/speckit-plan` | Generate the technical plan |
| `/speckit-tasks` | Break the plan into discrete implementation tasks |
| `/speckit-analyze` | Analyse implementation against spec |
| `/speckit-implement` | Drive the coding agent with the approved spec context |

> Run each skill from inside the relevant part folder so it picks up the correct `.specify/` project.

---

## Part 1A — Running the Harness

```zsh
cd Part-1A
npm install                 # install dependencies (first time)
npm test                    # Vitest — 103 tests (3 unit + 10 contract files); exits 0
npm run lint                # ESLint — 0 findings = pass
npm run security            # Semgrep + eslint-plugin-security + npm audit (requires semgrep on PATH)
npm run harness             # full harness runner: lint → security → test → report
```

`npm run harness` exits 0 on PASS and writes results to `evidence/harness-results/run-N-<timestamp>.{md,json}`.

No `.env` file is needed — Part 1A is fully offline.

---

## Part 1B — Running the Harness and Eval

```zsh
cd Part-1B
cp .env.example .env        # copy the template
# Edit .env — set OPENAI_API_KEY=sk-...
# Leave LLM_PROVIDER=openai and LLM_MODEL=gpt-4o-mini (defaults from .env.example)
npm install                 # install dependencies (first time)
npm test                    # Vitest — 77 tests (unit + integration); exits 0
npm run lint                # ESLint — 0 errors; 8 security-plugin warnings (accepted)
npm run security            # Semgrep 0 findings + npm audit --omit=dev 0 vulnerabilities
npm run harness             # sequential gate: lint → security → test → report
npm run eval                # 3-layer eval pipeline (requires LLM_PROVIDER=openai + API key)
```

`.env.example` variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `LLM_PROVIDER` | No | `openai` (default) or `stub` (tests only; eval refuses stub) |
| `LLM_MODEL` | No | Model passed to OpenAI API — default `gpt-4o-mini` |
| `OPENAI_API_KEY` | Yes (eval) | OpenAI secret key — required when `LLM_PROVIDER=openai` |

> `npm run eval` makes ~78 real API calls (26 cases × 3 runs). Expect ~$0.05 at gpt-4o-mini pricing. Results are written to `evidence/eval-results.json` and `evidence/eval-runs/run-N-<timestamp>.json`.

---

## Harness Pipeline Summary

**Part 1A (deterministic)**
```
lint guard → SAST guard → unit/contract tests → PASS/FAIL → harness-log.md → human review
```

**Part 1B (non-deterministic)**
```
eval dataset → LLM call × 3 runs → schema validation (L1) → invariant/property checks (L2)
  → semantic/quality eval (L3) → aggregate weighted score vs 0.85 threshold → PASS/FAIL
  → eval-results.json → harness-log.md → human review
```

---

## Git Workflow

- Feature branches: `feature/part-1a-todo-cli`, `feature/part-1b-reminder-agent`
- Merged to `main` with `--no-ff` (confirmed: both merge commits have two parents)
- No secrets in commits — `.env` is git-ignored; `.env.example` contains only placeholders

---

## Outcomes

### Part 1A — Smart Todo CLI

**ACCEPT** (human review: Sachin Wattamwar, 2026-11-15 — see `Part-1A/evidence/harness-log.md`)

The initial agent generation (Run 2) achieved 103/103 tests and 94.64% coverage but was **human-rejected**: command logic had been placed in `bin/commands/` to escape the `src/**` coverage scope, leaving `src/commands/` with empty placeholder files. The harness passed technically but was measuring only utility code. After the constitution was updated to v1.2.0 (covering `bin/**`), Run 3 exposed the real gap: 84.1% (below the 85% threshold). The root cause was 7 × identical `loadStore`/`saveStore` catch blocks duplicated across command files; centralising them into the new `src/loader.js` module raised coverage to 96.89% in Run 4/5.

**Known limitations:** two validation paths (untag invalid-tag, update invalid-priority) are enforced but have no AC-derived tests; no file-locking for concurrent writes.

### Part 1B — Natural-Language Reminder Agent

**ACCEPT** (human review: Sachin Wattamwar, 2026-11-23 — see `Part-1B/evidence/harness-log.md`)

The eval harness passed all three layers (77/77 unit tests, 94.16% coverage) after 9 repair cycles addressing Vitest mock-wiring issues and a Semgrep `ajv-allerrors-true` finding. The first real-model eval run (gpt-4o-mini, prompt v1) scored **0.524** against the 0.85 threshold, failing on: a harness INV-002/003/004/009 bug (4 malformed cases scored 0 despite correct CLI behaviour), "Remind me in X" → wrong `snooze` intent (3 cases), and a SEM-003 singular/plural keyword mismatch (2 guardrail cases). Two prompt repair cycles (v2: +9 fixes, −3 regressions; v3: +5 fixes, −2 regressions) brought the aggregate to **0.881**, with 100% schema validity and 4/4 guardrail cases passing.

**Known limitations:** AC-007 regressed in run 3 (snooze prompt example), AC-008 persists ("next Monday" from Sunday returns wrong date), AC-027 flaky ([1,1,0]), AC-028 persists (Feb 2028 boundary); `promptVersion` field in eval run JSONs shows `"v1"` for all three runs (hardcoded in protected harness — actual prompts used were v1/v2/v3 as documented in the harness log).

---

## Checklist (from Assignment §7)

- [x] Part 1A and Part 1B both included with Spec Kit SDD artifacts
- [x] Part 1A: working deterministic harness gates + spec-derived tests (103/103, 96.89% coverage)
- [x] Part 1B: 26 eval cases (≥15) + 3-layer non-deterministic eval pipeline
- [x] Harness results and failure/repair evidence preserved (5 runs for 1A, 9 harness + 3 eval runs for 1B)
- [x] `harness-log.md` present for both parts
- [x] Final human ACCEPT/REJECT + known limitations recorded
- [x] No API keys or `.env` secrets committed (`.env` is gitignored; `.env.example` has placeholders only)
