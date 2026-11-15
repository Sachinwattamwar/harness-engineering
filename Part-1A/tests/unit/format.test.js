import { describe, it, expect } from "vitest";
import {
  formatJson,
  formatTable,
  formatConfirmation,
  formatTaskDetail,
} from "../../src/format.js";

const sampleTask = {
  id: 1,
  title: "Write tests",
  description: "Test all the things",
  priority: "medium",
  tags: ["work", "urgent"],
  status: "todo",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("formatJson", () => {
  it("[AC-028][AC-029] single task returns parseable JSON string", () => {
    const result = formatJson(sampleTask);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("[AC-028][AC-029] parsed object has exactly the 8 snake_case keys", () => {
    const parsed = JSON.parse(formatJson(sampleTask));
    const expectedKeys = [
      "id",
      "title",
      "description",
      "priority",
      "tags",
      "status",
      "created_at",
      "updated_at",
    ];
    for (const key of expectedKeys) {
      expect(parsed).toHaveProperty(key);
    }
    // No camelCase keys
    expect(parsed).not.toHaveProperty("createdAt");
    expect(parsed).not.toHaveProperty("updatedAt");
  });

  it("[AC-028] array of tasks returns parseable JSON array", () => {
    const result = formatJson([sampleTask]);
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });
});

describe("formatTable", () => {
  it("returns a string containing the task title", () => {
    const result = formatTable([sampleTask]);
    expect(typeof result).toBe("string");
    expect(result).toContain("Write tests");
  });
});

describe("formatConfirmation", () => {
  it("returns the message string as-is", () => {
    const msg = "Task 1 created.";
    expect(formatConfirmation(msg)).toBe(msg);
  });
});

describe("formatTaskDetail", () => {
  it("[AC-021] returns a string containing all 8 field names", () => {
    const result = formatTaskDetail(sampleTask);
    expect(typeof result).toBe("string");
    expect(result).toContain("Write tests");
  });
});
