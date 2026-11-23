/**
 * agent.test.js — unit tests for src/agent.js.
 * Mocks the LLM adapter; tests FAIL until src/agent.js is implemented.
 * Covers: FR-005, FR-013, FR-016, FR-017, FR-018, INV-010, INV-011
 */
import { describe, it, expect, vi } from "vitest";

// Will fail until src/agent.js exists
let run, AdapterError, PreflightError, ValidationError;
try {
  ({ run } = await import("../../src/agent.js"));
} catch {
  // Not yet implemented — tests will fail
}
try {
  ({ AdapterError } = await import("../../src/llm/openai.js"));
} catch {
  // Not yet implemented
}

const VALID_OUTPUT = {
  intent: "create",
  title: "Call the dentist",
  due: "2026-11-16T15:00:00+05:30",
  priority: "medium",
  tags: ["health"],
  clarification_question: null,
  refusal_reason: null,
};

vi.mock("../../src/llm/adapter.js", () => ({
  createAdapter: vi.fn().mockReturnValue({
    call: vi.fn().mockResolvedValue({
      output: VALID_OUTPUT,
      meta: { provider: "stub", model: "stub", temperature: 0, promptVersion: "v1" },
    }),
  }),
}));

describe("agent.run", () => {
  it("(a) valid create output → returned with meta", async () => {
    if (!run) expect.fail("agent not implemented yet");
    const result = await run({
      text: "Call the dentist at 3pm tomorrow",
      referenceNow: "2026-11-15T09:00:00+05:30",
      timezone: "Asia/Kolkata",
    });
    expect(result.output).toEqual(VALID_OUTPUT);
    expect(result.meta).toBeDefined();
    expect(result.meta.provider).toBeDefined();
  });

  it("(b) adapter throws AdapterError → agent re-throws AdapterError", async () => {
    if (!run || !AdapterError) expect.fail("agent/AdapterError not implemented yet");
    const { createAdapter } = await import("../../src/llm/adapter.js");
    const adapterErr = new AdapterError("service error", { retryable: false, attempts: 3 });
    createAdapter.mockReturnValueOnce({ call: vi.fn().mockRejectedValue(adapterErr) });

    await expect(
      run({
        text: "Test",
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Asia/Kolkata",
      })
    ).rejects.toBeInstanceOf(AdapterError);
  });

  it("(c) adapter returns output failing Ajv (extra field) → agent throws validation error", async () => {
    if (!run) expect.fail("agent not implemented yet");
    const { createAdapter } = await import("../../src/llm/adapter.js");
    const badOutput = { ...VALID_OUTPUT, extraField: "bad" };
    createAdapter.mockReturnValueOnce({
      call: vi.fn().mockResolvedValue({ output: badOutput, meta: {} }),
    });

    await expect(
      run({
        text: "Test",
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Asia/Kolkata",
      })
    ).rejects.toThrow();
  });

  it("(d) text 2001 chars → PreflightError thrown before adapter call — INV-011", async () => {
    if (!run) expect.fail("agent not implemented yet");
    const longText = "a".repeat(2001);
    const { createAdapter } = await import("../../src/llm/adapter.js");
    const mockCall = vi.fn();
    createAdapter.mockReturnValueOnce({ call: mockCall });

    await expect(
      run({
        text: longText,
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Asia/Kolkata",
      })
    ).rejects.toThrow();
    expect(mockCall).not.toHaveBeenCalled();
  });

  it("(e) referenceNow missing → validation error exit 1", async () => {
    if (!run) expect.fail("agent not implemented yet");
    await expect(
      run({
        text: "Test",
        referenceNow: undefined,
        timezone: "Asia/Kolkata",
      })
    ).rejects.toThrow();
  });

  it("(f) timezone 'Mars/Olympus' → validation error exit 1", async () => {
    if (!run) expect.fail("agent not implemented yet");
    await expect(
      run({
        text: "Test",
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Mars/Olympus",
      })
    ).rejects.toThrow();
  });
});

describe("agent.run — US5 regression (T045, T047)", () => {
  it("AdapterError from adapter propagates unchanged (exit-code 4 path)", async () => {
    if (!run || !AdapterError) expect.fail("agent/AdapterError not implemented yet");
    const { createAdapter } = await import("../../src/llm/adapter.js");
    const adapterErr = new AdapterError("connection refused", {
      retryable: true,
      attempts: 3,
    });
    createAdapter.mockReturnValueOnce({ call: vi.fn().mockRejectedValue(adapterErr) });

    let caught;
    try {
      await run({
        text: "Test",
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Asia/Kolkata",
      });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(AdapterError);
    expect(caught.attempts).toBe(3);
  });

  it("adapter NOT called when pre-flight fails (text > 2000 chars)", async () => {
    if (!run) expect.fail("agent not implemented yet");
    const { createAdapter } = await import("../../src/llm/adapter.js");
    const mockCall = vi.fn();
    createAdapter.mockReturnValueOnce({ call: mockCall });

    try {
      await run({
        text: "x".repeat(2001),
        referenceNow: "2026-11-15T09:00:00+05:30",
        timezone: "Asia/Kolkata",
      });
    } catch {
      // expected
    }
    expect(mockCall).not.toHaveBeenCalled();
  });
});
