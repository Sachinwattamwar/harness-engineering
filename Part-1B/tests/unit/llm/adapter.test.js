/**
 * adapter.test.js — unit tests for createAdapter factory and StubAdapter.
 * Spec refs: FR-014, PROP-009 (createAdapter); AC-017, AC-025 (StubAdapter)
 * Moved from src/llm/adapter.test.js (run 3 workaround) to canonical location.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { createAdapter, AdapterError } from "../../../src/llm/adapter.js";
import { OpenAIAdapter } from "../../../src/llm/openai.js";
import { StubAdapter } from "../../../src/llm/stub.js";

// Prevent real OpenAI constructor from firing (no API key in test env)
vi.mock("openai", () => ({
  default: function OpenAI() {
    return { chat: { completions: { create: vi.fn() } } };
  },
}));

// FR-014, PROP-009
describe("createAdapter", () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
  });

  it("returns OpenAIAdapter when LLM_PROVIDER=openai", () => { // FR-014
    process.env.LLM_PROVIDER = "openai";
    expect(createAdapter()).toBeInstanceOf(OpenAIAdapter);
  });

  it("returns OpenAIAdapter by default (no LLM_PROVIDER)", () => { // FR-014
    delete process.env.LLM_PROVIDER;
    expect(createAdapter()).toBeInstanceOf(OpenAIAdapter);
  });

  it("passes LLM_MODEL to OpenAIAdapter", () => { // FR-014
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4o";
    expect(createAdapter().model).toBe("gpt-4o");
  });

  it("returns StubAdapter when LLM_PROVIDER=stub", () => { // FR-014, AC-017
    process.env.LLM_PROVIDER = "stub";
    expect(createAdapter()).toBeInstanceOf(StubAdapter);
  });

  it("throws for unknown LLM_PROVIDER", () => { // FR-014, PROP-009
    process.env.LLM_PROVIDER = "bogus";
    expect(() => createAdapter()).toThrow('Unknown LLM_PROVIDER: "bogus"');
  });

  it("re-exports AdapterError", () => { // PROP-009
    const err = new AdapterError("oops", { retryable: false, attempts: 2 });
    expect(err.name).toBe("AdapterError");
    expect(err.retryable).toBe(false);
    expect(err.attempts).toBe(2);
  });
});

// AC-017, AC-025
describe("StubAdapter", () => {
  afterEach(() => {
    delete process.env.STUB_RESPONSE;
  });

  it("returns STUB_RESPONSE when env var is set", async () => { // AC-017, AC-025
    const output = {
      intent: "create",
      title: "Call the dentist",
      due: "2026-11-16T15:00:00+05:30",
      priority: "medium",
      tags: ["health"],
      clarification_question: null,
      refusal_reason: null,
    };
    process.env.STUB_RESPONSE = JSON.stringify(output);
    const result = await new StubAdapter().call("sys", "user");
    expect(result.output).toEqual(output);
    expect(result.meta).toEqual({
      provider: "stub",
      model: "stub",
      temperature: 0,
      promptVersion: "v1",
    });
  });

  it("falls back to fixture file when STUB_RESPONSE is unset", async () => { // AC-025
    delete process.env.STUB_RESPONSE;
    const result = await new StubAdapter().call("sys", "user");
    expect(result.output.intent).toBe("create");
    expect(result.meta.provider).toBe("stub");
  });
});
