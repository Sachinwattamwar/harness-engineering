import { describe, it, expect } from "vitest";
import {
  validateTitle,
  validatePriority,
  validateTag,
  validateId,
} from "../../src/validate.js";

describe("validateTitle", () => {
  it("[AC-005] empty string is invalid — error contains '120' and 'character'", () => {
    const result = validateTitle("");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/120/);
    expect(result.error).toMatch(/character/i);
  });

  it("[AC-005] 121-character title is invalid", () => {
    const result = validateTitle("a".repeat(121));
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/120/);
  });

  it("[AC-004] 120-character title is valid", () => {
    const result = validateTitle("a".repeat(120));
    expect(result.valid).toBe(true);
  });

  it("1-character title is valid", () => {
    expect(validateTitle("x").valid).toBe(true);
  });
});

describe("validatePriority", () => {
  it("[AC-034] 'critical' is invalid — error contains 'priority', 'low', 'medium', 'high'", () => {
    const result = validatePriority("critical");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/priority/i);
    expect(result.error).toMatch(/low/);
    expect(result.error).toMatch(/medium/);
    expect(result.error).toMatch(/high/);
  });

  it("'low' is valid", () => expect(validatePriority("low").valid).toBe(true));
  it("'medium' is valid", () => expect(validatePriority("medium").valid).toBe(true));
  it("'high' is valid", () => expect(validatePriority("high").valid).toBe(true));
});

describe("validateTag", () => {
  it("[AC-019][AC-041] uppercase tag is invalid — error contains 'lowercase'", () => {
    const result = validateTag("WORK");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/lowercase/i);
  });

  it("[AC-039] empty string is invalid — error contains 'tag'", () => {
    const result = validateTag("");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/tag/i);
  });

  it("[AC-038] tag with space is invalid", () => {
    const result = validateTag("my tag");
    expect(result.valid).toBe(false);
  });

  it("'valid-tag-123' is valid", () => {
    expect(validateTag("valid-tag-123").valid).toBe(true);
  });

  it("all-lowercase letters are valid", () => {
    expect(validateTag("work").valid).toBe(true);
  });
});

describe("validateId", () => {
  it("[AC-036] non-numeric 'abc' is invalid — error contains 'id' or 'integer'", () => {
    const result = validateId("abc");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/id|integer/i);
  });

  it("[AC-037] '-1' is invalid — error contains 'id' or 'positive'", () => {
    const result = validateId("-1");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/id|positive/i);
  });

  it("'0' is invalid", () => {
    expect(validateId("0").valid).toBe(false);
  });

  it("'1' is valid", () => {
    expect(validateId("1").valid).toBe(true);
  });

  it("'100' is valid", () => {
    expect(validateId("100").valid).toBe(true);
  });
});
