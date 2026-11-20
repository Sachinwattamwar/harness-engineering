import { describe, it, expect, afterEach, vi } from "vitest";
import { createAdapter, AdapterError } from "./adapter.js";
import { OpenAIAdapter } from "./openai.js";
import { StubAdapter } from "./stub.js";

// Prevent real OpenAI constructor from firing (no API key in test env)
vi.mock("openai", () => ({
  default: function OpenAI() {
    return { chat: { completions: { create: vi.fn() } } };
  },
}));

describe("createAdapter", () => {
  afterEach(() => {
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
  });

  it("returns OpenAIAdapter when LLM_PROVIDER=openai", () => {
    process.env.LLM_PROVIDER = "openai";
    expect(createAdapter()).toBeInstanceOf(OpenAIAdapter);
  });

  it("returns OpenAIAdapter by default (no LLM_PROVIDER)", () => {
    delete process.env.LLM_PROVIDER;
    expect(createAdapter()).toBeInstanceOf(OpenAIAdapter);
  });

  it("passes LLM_MODEL to OpenAIAdapter", () => {
    process.env.LLM_PROVIDER = "openai";
    process.env.LLM_MODEL = "gpt-4o";
    expect(createAdapter().model).toBe("gpt-4o");
  });

  it("returns StubAdapter when LLM_PROVIDER=stub", () => {
    process.env.LLM_PROVIDER = "stub";
    expect(createAdapter()).toBeInstanceOf(StubAdapter);
  });

  it("throws for unknown LLM_PROVIDER", () => {
    process.env.LLM_PROVIDER = "bogus";
    expect(() => createAdapter()).toThrow('Unknown LLM_PROVIDER: "bogus"');
  });

  it("re-exports AdapterError", () => {
    const err = new AdapterError("oops", { retryable: false, attempts: 2 });
    expect(err.name).toBe("AdapterError");
    expect(err.retryable).toBe(false);
    expect(err.attempts).toBe(2);
  });
});

describe("StubAdapter", () => {
  afterEach(() => {
    delete process.env.STUB_RESPONSE;
  });

  it("returns STUB_RESPONSE when env var is set", async () => {
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

  it("falls back to fixture file when STUB_RESPONSE is unset", async () => {
    delete process.env.STUB_RESPONSE;
    const result = await new StubAdapter().call("sys", "user");
    expect(result.output.intent).toBe("create");
    expect(result.meta.provider).toBe("stub");
  });
});
