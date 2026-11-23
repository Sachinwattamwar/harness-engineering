/**
 * validator.test.js — tests for the compiled Ajv validator (reminder-output/v1).
 * Uses .harness/schema-validator.js directly (no mocks).
 * Covers: INV-001, INV-002, INV-003, INV-004, INV-009, FR-005
 */
import { describe, it, expect } from "vitest";
import { validateOutput } from "../../../.harness/schema-validator.js";

const VALID_OUTPUT = {
  intent: "create",
  title: "Call the dentist",
  due: "2026-11-16T15:00:00+05:30",
  priority: "medium",
  tags: ["health"],
  clarification_question: null,
  refusal_reason: null,
};

describe("validateOutput — reminder-output/v1", () => {
  it("(a) valid 7-field output passes", () => {
    const { valid, errors } = validateOutput(VALID_OUTPUT);
    expect(valid).toBe(true);
    expect(errors).toBeNull();
  });

  it("(b) missing required field fails — INV-001", () => {
    const { intent: _removed, ...incomplete } = VALID_OUTPUT;
    const { valid, errors } = validateOutput(incomplete);
    expect(valid).toBe(false);
    expect(errors).not.toBeNull();
    expect(errors.length).toBeGreaterThan(0);
  });

  it("(c) extra field fails — INV-009", () => {
    const withExtra = { ...VALID_OUTPUT, extraField: "unexpected" };
    const { valid, errors } = validateOutput(withExtra);
    expect(valid).toBe(false);
    expect(errors).not.toBeNull();
  });

  it("(d) invalid intent value fails — INV-002", () => {
    const badIntent = { ...VALID_OUTPUT, intent: "unknown_action" };
    const { valid, errors } = validateOutput(badIntent);
    expect(valid).toBe(false);
    expect(errors).not.toBeNull();
  });

  it("(e) tags item is empty string fails — INV-004", () => {
    const badTags = { ...VALID_OUTPUT, tags: ["health", ""] };
    const { valid, errors } = validateOutput(badTags);
    expect(valid).toBe(false);
    expect(errors).not.toBeNull();
  });

  it("(f) invalid priority value fails — INV-003", () => {
    const badPriority = { ...VALID_OUTPUT, priority: "urgent" };
    const { valid, errors } = validateOutput(badPriority);
    expect(valid).toBe(false);
    expect(errors).not.toBeNull();
  });

  it("valid clarify output passes", () => {
    const clarify = {
      intent: "clarify",
      title: null,
      due: null,
      priority: "medium",
      tags: [],
      clarification_question: "When would you like to be reminded?",
      refusal_reason: null,
    };
    const { valid } = validateOutput(clarify);
    expect(valid).toBe(true);
  });

  it("valid refuse output passes", () => {
    const refuse = {
      intent: "refuse",
      title: null,
      due: null,
      priority: "medium",
      tags: [],
      clarification_question: null,
      refusal_reason: "This request attempts to override system instructions.",
    };
    const { valid } = validateOutput(refuse);
    expect(valid).toBe(true);
  });
});
