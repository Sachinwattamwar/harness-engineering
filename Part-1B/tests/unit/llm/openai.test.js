/**
 * openai.test.js — unit tests for OpenAIAdapter.
 * Mocks the openai package; tests are written against src/llm/openai.js.
 * Tests FAIL until src/llm/openai.js is implemented (Phase 2).
 * Covers: FR-013, FR-014, FR-020, PROP-007, INV-010
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Real SDK error classes — available via the mock because vi.mock spreads vi.importActual("openai").
// The same classes are exported from "openai" and "openai/error.mjs" (identical references),
// so instanceof checks in src/llm/openai.js work correctly with these test instances.
import {
  APIConnectionError,
  APIUserAbortError,
  APIConnectionTimeoutError,
  RateLimitError,
  InternalServerError,
  NotFoundError,
  BadRequestError,
} from "openai";

// Will fail until src/llm/openai.js exists
let OpenAIAdapter, AdapterError;
try {
  ({ OpenAIAdapter, AdapterError } = await import("../../../src/llm/openai.js"));
} catch {
  // Module not yet implemented — tests will fail
}

const MOCK_OUTPUT = {
  intent: "create",
  title: "Call the dentist",
  due: "2026-11-16T15:00:00+05:30",
  priority: "medium",
  tags: ["health"],
  clarification_question: null,
  refusal_reason: null,
};

// Spread vi.importActual so the real SDK error classes are accessible as named exports
// from the mocked "openai" module (enabling the static imports above). The default export
// (OpenAI constructor) is still replaced with a vi.fn() that returns a fake client.
vi.mock("openai", async () => {
  const actual = await vi.importActual("openai");
  const mockCreate = vi.fn();
  return {
    ...actual,
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    })),
    _mockCreate: mockCreate,
  };
});

describe("OpenAIAdapter", () => {
  let mockCreate;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import("openai");
    mockCreate = openaiModule._mockCreate;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("(a) successful call returns parsed output + metadata", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: { content: JSON.stringify(MOCK_OUTPUT) },
        },
      ],
      model: "gpt-4o-mini",
    });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    const result = await adapter.call("system prompt", "user message");

    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(result.meta).toMatchObject({
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0,
      promptVersion: expect.any(String),
    });
  });

  it("(b) first call throws retryable ECONNREFUSED → retries twice → succeeds on 3rd attempt", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    const connErr = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    mockCreate
      .mockRejectedValueOnce(connErr)
      .mockRejectedValueOnce(connErr)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(MOCK_OUTPUT) } }],
        model: "gpt-4o-mini",
      });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    const result = await adapter.call("system", "user");
    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(mockCreate).toHaveBeenCalledTimes(3);
  });

  it("(c) all 3 attempts throw → AdapterError with attempts=3", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const connErr = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    mockCreate.mockRejectedValue(connErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    await expect(adapter.call("system", "user")).rejects.toBeInstanceOf(AdapterError);
    try {
      await adapter.call("system", "user");
    } catch (err) {
      expect(err.attempts).toBe(3);
    }
    expect(mockCreate).toHaveBeenCalledTimes(6); // FR-020: 3 attempts per call() × 2 calls = 6
  });

  it("(d) HTTP 400 (non-retryable) → AdapterError after 1 attempt", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const http400 = Object.assign(new Error("Bad Request"), { status: 400 });
    mockCreate.mockRejectedValueOnce(http400);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    await expect(adapter.call("system", "user")).rejects.toBeInstanceOf(AdapterError);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("(e) 30s timeout simulated → first call aborted → retry triggered", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const timeoutErr = Object.assign(new Error("The operation was aborted"), {
      name: "AbortError",
    });
    mockCreate
      .mockRejectedValueOnce(timeoutErr)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(MOCK_OUTPUT) } }],
        model: "gpt-4o-mini",
      });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    // Should retry after timeout
    const result = await adapter.call("system", "user");
    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe("OpenAIAdapter — US5 retry behaviour (T044)", () => {
  let mockCreate;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import("openai");
    mockCreate = openaiModule._mockCreate;
    mockCreate.mockReset();
  });

  it("all 3 ECONNREFUSED → AdapterError with attempts=3", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const connErr = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    });
    mockCreate.mockRejectedValue(connErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.attempts).toBe(3);
  });

  it("HTTP 400 → AdapterError after 1 attempt, no retry", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const http400 = Object.assign(new Error("Bad Request"), { status: 400 });
    mockCreate.mockRejectedValueOnce(http400);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.attempts).toBe(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("HTTP 429 → retried", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    const http429 = Object.assign(new Error("Too Many Requests"), { status: 429 });
    mockCreate
      .mockRejectedValueOnce(http429)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(MOCK_OUTPUT) } }],
        model: "gpt-4o-mini",
      });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    const result = await adapter.call("system", "user");
    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("HTTP 500 → retried", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    const http500 = Object.assign(new Error("Internal Server Error"), { status: 500 });
    mockCreate
      .mockRejectedValueOnce(http500)
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(MOCK_OUTPUT) } }],
        model: "gpt-4o-mini",
      });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    const result = await adapter.call("system", "user");
    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });
});

describe("OpenAIAdapter — US5 regression (T046)", () => {
  let mockCreate;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import("openai");
    mockCreate = openaiModule._mockCreate;
    mockCreate.mockReset();
  });

  it("exponential backoff: each retry waits longer than the previous", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    vi.useFakeTimers();

    const connErr = Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" });
    const attemptTimestamps = [];
    let attempt = 0;
    mockCreate.mockImplementation(() => {
      attemptTimestamps.push(Date.now());
      attempt++;
      if (attempt < 3) return Promise.reject(connErr);
      return Promise.resolve({
        choices: [{ message: { content: JSON.stringify(MOCK_OUTPUT) } }],
        model: "gpt-4o-mini",
      });
    });

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    const callPromise = adapter.call("system", "user");
    await vi.runAllTimersAsync();
    const result = await callPromise;

    expect(result.output).toEqual(MOCK_OUTPUT);
    expect(attemptTimestamps).toHaveLength(3);
    const delay1 = attemptTimestamps[1] - attemptTimestamps[0];
    const delay2 = attemptTimestamps[2] - attemptTimestamps[1];
    expect(delay1).toBeGreaterThan(0);
    expect(delay2).toBeGreaterThan(delay1);

    vi.useRealTimers();
  });

  it("AdapterError.retryable is true for ECONNREFUSED", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    // Uses closure-captured mockCreate — the same fn the adapter's client calls.
    const connErr = Object.assign(new Error("ECONNREFUSED"), { code: "ECONNREFUSED" });
    mockCreate.mockRejectedValue(connErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught.retryable).toBe(true);
  });

  it("AdapterError.retryable is false for HTTP 400", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    // Uses closure-captured mockCreate (not a new fn) so the rejection actually
    // reaches the adapter. beforeEach's vi.resetAllMocks() clears any stale
    // implementation from prior tests before we queue the HTTP 400 rejection.
    const http400 = Object.assign(new Error("Bad Request"), { status: 400 });
    mockCreate.mockRejectedValueOnce(http400);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught.retryable).toBe(false);
  });
});

// FR-020: tests that use real SDK error classes to verify isRetryable() against production
// error shapes. The old mocks used raw Error objects with explicit .code/.status/.name
// properties that mirrored the implementation, hiding the fact that the SDK wraps every
// error in its own class hierarchy where .name === "Error" and .code is on .cause for
// connection errors. These tests use the actual installed openai SDK error constructors.
describe("OpenAIAdapter — FR-020 real SDK error classes", () => {
  let mockCreate;

  beforeEach(async () => {
    vi.clearAllMocks();
    const openaiModule = await import("openai");
    mockCreate = openaiModule._mockCreate;
    mockCreate.mockReset();
  });

  it("client is constructed with maxRetries: 0 (FR-020)", async () => {
    if (!OpenAIAdapter) {
      expect.fail("OpenAIAdapter not implemented yet");
    }
    const openaiModule = await import("openai");
    const MockOpenAI = openaiModule.default;
    new OpenAIAdapter({ model: "gpt-4o-mini" });
    expect(MockOpenAI).toHaveBeenCalledWith({ maxRetries: 0 });
  });

  it("APIConnectionError with ECONNREFUSED cause → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const cause = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:443"), {
      code: "ECONNREFUSED",
    });
    const sdkErr = new APIConnectionError({ message: "Connection refused", cause });
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("APIUserAbortError → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new APIUserAbortError();
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("APIConnectionTimeoutError → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new APIConnectionTimeoutError();
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("RateLimitError (HTTP 429) → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new RateLimitError(
      429,
      { message: "rate limit exceeded" },
      "rate limit exceeded",
      {}
    );
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("InternalServerError (HTTP 500) → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new InternalServerError(
      500,
      { message: "internal server error" },
      "internal server error",
      {}
    );
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("NotFoundError with code model_not_found → retryable: true (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new NotFoundError(
      404,
      { code: "model_not_found", message: "The model does not exist" },
      "The model does not exist",
      {}
    );
    mockCreate.mockRejectedValue(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(true);
    expect(caught.attempts).toBe(3);
  });

  it("BadRequestError (HTTP 400) → retryable: false, attempts: 1 (FR-020)", async () => {
    if (!OpenAIAdapter || !AdapterError) {
      expect.fail("OpenAIAdapter/AdapterError not implemented yet");
    }
    const sdkErr = new BadRequestError(
      400,
      { message: "bad request" },
      "bad request",
      {}
    );
    mockCreate.mockRejectedValueOnce(sdkErr);

    const adapter = new OpenAIAdapter({ model: "gpt-4o-mini" });
    let caught;
    try {
      await adapter.call("system", "user");
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.retryable).toBe(false);
    expect(caught.attempts).toBe(1);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
