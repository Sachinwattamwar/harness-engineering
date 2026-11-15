<!--
SYNC IMPACT REPORT (remove before commit)
=========================================
Version change:  [template / unversioned] → 1.0.0
Added sections:
  - Core Principles
      I.   Output Contract
      II.  Traceability & ID System
      III. Evaluation Standards
      IV.  Error Classification
      V.   Provider Abstraction
  - Security & Quality Standards
      VI.  Secret Hygiene
      VII. Quality Gates
  - Agent Integrity Rules
      VIII. Agent Rules
      IX.   Harness Independence
  - Governance
Removed sections: none (first ratified version; replaced unfilled template)
Modified: all placeholders replaced
TODOs / deferred: none — all user-supplied principles fully encoded
-->

# NL Reminder Agent Constitution

## Core Principles

### I. Output Contract (NON-NEGOTIABLE)

Every response produced by the LLM MUST be validated against a versioned JSON Schema before
the result is returned to the caller. The schema version MUST be recorded alongside every
output. Outputs that fail schema validation MUST be classified as FAIL and MUST NOT be
surfaced as successful results. The JSON Schema is the normative output contract; any change
to it constitutes a breaking change and requires a schema version bump.

### II. Traceability & ID System

Every structural invariant is assigned an `INV-xxx` identifier, every behavioural property a
`PROP-xxx` identifier, and every guardrail rule a `GR-xxx` identifier. Functional requirements
use `FR-xxx`; acceptance criteria use `AC-xxx`. Every eval case MUST map to at least one
INV/PROP/GR or FR/AC identifier. Identifiers are immutable once assigned; retired identifiers
are marked deprecated rather than deleted. This makes every test and eval case traceable to
a governance rule.

### III. Evaluation Standards (NON-NEGOTIABLE)

Evaluation thresholds MUST be declared before any evaluation run and MUST NEVER be lowered
after results are observed. Required thresholds:

- 100% structural validity: all outputs pass JSON Schema validation.
- 100% of guardrail cases (`GR-xxx`) correct.
- ≥ 85% aggregate weighted score across all eval cases.

Each eval case MUST run exactly 3 times at temperature 0; the per-case score is the arithmetic
mean of those 3 runs. Cases whose 3 runs disagree (flaky) MUST be reported separately and do
not count as passes. Model name, temperature, prompt version, and harness version MUST be
recorded with every eval run.

### IV. Error Classification

Model/service failures—including unreachable endpoint, connection timeout, rate-limit (HTTP
429), server error (HTTP 5xx), and missing or unknown model—MUST be classified as `ERROR`,
distinct from application-logic `FAIL`. `ERROR` results MUST trigger automatic retry with
exponential backoff (minimum 2 retries before propagating). `ERROR` results MUST NEVER be
counted as passes or failures in eval scoring; they are reported in a separate ERROR bucket.
This separation ensures infrastructure flakiness cannot corrupt eval pass rates.

### V. Provider Abstraction

The LLM provider MUST be accessed exclusively through an adapter layer. The active provider,
model name, temperature, and prompt version MUST be selectable via environment variables and
MUST be recorded in full with every eval run. No application code outside the adapter layer
MUST contain provider-specific API calls. This isolation enables provider substitution without
altering business logic or eval harness code.

## Security & Quality Standards

### VI. Secret Hygiene (NON-NEGOTIABLE)

All credentials and API keys MUST be sourced exclusively from environment variables. Secrets
MUST NEVER be logged, printed, committed to version control, or included in error messages.
The agent MUST NEVER read `.env` files directly at runtime; the shell environment is the sole
permitted source. Violation of this principle is an immediate release blocker regardless of
test passage.

### VII. Quality Gates (NON-NEGOTIABLE)

The following gates MUST pass on every commit; none may be waived:

- **Lint**: ESLint reports 0 errors.
- **SAST**: Semgrep reports 0 findings.
- **Dependencies**: `npm audit` reports 0 high or critical vulnerabilities.
- **Tests**: Vitest reports 100% pass; line coverage ≥ 85% over ALL application code in
  `src/` and `bin/`, including code exercised via CLI subprocess invocations.
- **Source completeness**: No placeholder or comment-only source files exist in `src/` or
  `bin/`.
- **Test isolation**: Unit tests MUST mock the LLM adapter; only the eval harness is permitted
  to invoke a real model. This ensures unit-test results are deterministic and free of cost or
  rate-limit side effects.

## Agent Integrity Rules

### VIII. Agent Rules (NON-NEGOTIABLE)

The following rules are absolute and apply to all contributors, automated agents, and tools:

- MUST NOT weaken, soften, or delete acceptance criteria, eval cases, expected results, or
  evaluation thresholds.
- MUST NOT skip, comment out, or delete failing tests. Failing tests MUST be fixed, not
  suppressed.
- MUST NOT disable ESLint rules (via `eslint-disable`) or Semgrep rules (via `nosemgrep`)
  without a documented justification committed in the same changeset.
- MUST NOT edit previously recorded eval results.
- All legitimate changes to spec, eval cases, thresholds, or governance MUST flow through the
  Spec Kit artifact workflow and be recorded with rationale before taking effect.

### IX. Harness Independence

The test suite and eval harness MUST be derived from the specification, not from the
implementation. No test file MUST import internal implementation details beyond the public
module API. Eval cases MUST be authored against the spec's INV/PROP/GR identifiers, not
against specific code paths. This guarantees that tests remain valid through refactors and that
the spec—not the code—is the authoritative source of correctness.

## Governance

This constitution supersedes all other development practices and guidance documents for the
NL Reminder Agent project. In any conflict between the constitution and other documentation,
the constitution takes precedence.

**Amendment procedure**: Amendments require (1) a written proposal identifying the principle
and rationale, (2) an update to this file via the Spec Kit constitution workflow (`/speckit-constitution`),
(3) a version bump per the versioning policy, and (4) a dependent artifact review (spec, plan,
tasks, eval cases) to verify consistency.

**Versioning policy**:
- MAJOR bump: removal or backward-incompatible redefinition of an existing principle.
- MINOR bump: new principle or section added, or material expansion of an existing principle.
- PATCH bump: clarification, wording improvement, typo fix, or non-semantic refinement.

**Compliance review**: All pull requests MUST include a checklist confirming compliance with
every NON-NEGOTIABLE principle. Any reviewer may block a PR that violates the constitution.
Compliance is also verified by the automated quality gates (Principle VII) on every commit.

**Version**: 1.0.0 | **Ratified**: 2026-11-15 | **Last Amended**: 2026-11-15
