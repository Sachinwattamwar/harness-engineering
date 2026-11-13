# Assignment 1 — Spec-Driven Development & Harness Engineering

**Course:** AI-Augmented SDLC (SEZG534) · **Deadline:** 15 November 2026  
**Student:** Sachin Wattamwar · **Stack:** Node.js 22+ (ES modules, plain JS)

---

## Overview

This repository contains two applications built end-to-end via the GitHub **Spec Kit** Spec-Driven Development (SDD) workflow, each validated by an independent harness before human acceptance.

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
│   ├── .specify/               ← Spec Kit project (constitution, specs, plans, tasks)
│   ├── .claude/skills/         ← Spec Kit Claude Code skills
│   ├── src/                    ← TODO: application source
│   ├── tests/                  ← TODO: Vitest unit + contract tests
│   ├── .harness/               ← TODO: lint / SAST / test runner scripts
│   └── evidence/               ← TODO: initial-generation/, final-generation/, harness-log.md
│
└── Part-1B/                    ← Natural-Language Reminder Agent
    ├── .specify/               ← Spec Kit project
    ├── .claude/skills/         ← Spec Kit Claude Code skills
    ├── .env.example            ← placeholder env vars (copy → .env, fill in key)
    ├── src/                    ← TODO: application source
    ├── prompts/                ← TODO: system prompt(s)
    ├── tests/                  ← TODO: Vitest unit tests
    ├── evals/
    │   └── dataset.json        ← TODO: ≥15 evaluation cases
    ├── .harness/               ← TODO: schema / property / quality evaluators + eval runner
    └── evidence/               ← TODO: initial-generation/, final-generation/, eval-results.json, harness-log.md
```

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | `brew install node` or https://nodejs.org |
| npm | 10+ | bundled with Node |
| git | any | `brew install git` |
| Anthropic API key | — | Required for Part 1B only; set in `Part-1B/.env` |

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
| `/speckit-analyze` | Analyse implementation against spec (where applicable) |
| `/speckit-implement` | Drive the coding agent with the approved spec context |

> Run each skill from inside the relevant part folder so it picks up the correct `.specify/` project.

---

## Part 1A — Running the Harness

```zsh
cd Part-1A
npm install                 # install dependencies (first time)
npm test                    # Vitest unit + contract tests
npm run lint                # ESLint static check
npm run security            # Semgrep + eslint-plugin-security + npm audit
npm run harness             # TODO: full harness runner (lint → security → test → report)
```

> **TODO:** `src/`, `tests/`, and `.harness/` do not exist yet — commands above will be wired after /speckit-implement.

---

## Part 1B — Running the Harness

```zsh
cd Part-1B
cp .env.example .env        # then fill in ANTHROPIC_API_KEY
npm install                 # install dependencies (first time)
npm test                    # Vitest unit tests
npm run lint                # ESLint static check
npm run security            # Semgrep + eslint-plugin-security + npm audit
npm run eval                # TODO: full eval harness (schema → invariants → semantic → score)
npm run harness             # TODO: alias for eval runner
```

> **TODO:** `src/`, `prompts/`, `tests/`, `evals/dataset.json`, and `.harness/` do not exist yet.

---

## Harness Pipeline Summary

**Part 1A (deterministic)**
```
lint guard → SAST guard → unit/contract tests → PASS/FAIL → harness-log.md → human review
```

**Part 1B (non-deterministic)**
```
eval dataset → LLM call → schema validation (L1) → invariant/property checks (L2)
  → semantic/quality eval (L3) → aggregate score vs threshold → PASS/FAIL
  → harness-log.md → human review
```

---

## Git Workflow

- Feature branches: `feature/part-1a-todo-cli`, `feature/part-1b-reminder-agent`
- Merge to `main` with `--no-ff`
- No secrets in commits — see `.gitignore`

---

## Checklist (from Assignment §7)

- [ ] Part 1A and Part 1B both included with Spec Kit SDD artifacts
- [ ] Part 1A: working deterministic harness gates + spec-derived tests
- [ ] Part 1B: ≥15 eval cases + non-deterministic eval pipeline
- [ ] Harness results and failure/repair evidence preserved
- [ ] `harness-log.md` present for both parts
- [ ] Final human ACCEPT/REJECT + known limitations recorded
- [ ] No API keys or `.env` secrets committed
