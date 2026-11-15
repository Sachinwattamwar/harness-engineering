import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function withTaggedTask(fn) {
  const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
  const env = { TODO_FILE: todoFile };
  await runCli(["add", "--title", "Test task", "--tag", "work"], env);
  try {
    await fn(todoFile);
  } finally {
    await removeTempFile(todoFile);
  }
}

describe("untag command", () => {
  it("[AC-015] untag 1 work: confirmation, exit 0, tag absent", async () => {
    await withTaggedTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      const { exitCode, stdout } = await runCli(["untag", "1", "work"], env);
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
      const { stdout: jsonOut } = await runCli(["show", "1", "--json"], env);
      const task = JSON.parse(jsonOut);
      expect(task.tags).not.toContain("work");
    });
  });

  it("[AC-044] untag 1 work --json: valid JSON with 'work' absent, snake_case keys", async () => {
    await withTaggedTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["untag", "1", "work", "--json"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      let parsed;
      expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
      expect(parsed.tags).not.toContain("work");
      for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
        expect(parsed).toHaveProperty(key);
      }
    });
  });

  it("[AC-046] untag 1 missing (not on task): no-op confirmation, exit 0", async () => {
    await withTaggedTask(async (todoFile) => {
      const { exitCode, stdout } = await runCli(
        ["untag", "1", "missing"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
    });
  });

  it("[AC-055] untag 99 work: exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["untag", "99", "work"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-059] untag no-op --json: valid JSON, tag absent, exit 0", async () => {
    await withTaggedTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["untag", "1", "missing", "--json"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.tags).not.toContain("missing");
    });
  });
});
