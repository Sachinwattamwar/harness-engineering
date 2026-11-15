import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function withTask(fn) {
  const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
  await runCli(["add", "--title", "Test task"], { TODO_FILE: todoFile });
  try {
    await fn(todoFile);
  } finally {
    await removeTempFile(todoFile);
  }
}

describe("tag command", () => {
  it("[AC-014] tag 1 work: confirmation, exit 0, task has 'work'", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      const { stdout, exitCode } = await runCli(["tag", "1", "work"], env);
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
      const { stdout: jsonOut } = await runCli(["show", "1", "--json"], env);
      const task = JSON.parse(jsonOut);
      expect(task.tags).toContain("work");
    });
  });

  it("[AC-018] 10 existing tags → add 11th: exit 1, stderr contains '10' and 'tag'", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      for (let i = 1; i <= 10; i++) {
        await runCli(["tag", "1", `tag${i}`], env);
      }
      const { stderr, exitCode } = await runCli(["tag", "1", "eleventh"], env);
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/10/);
      expect(stderr).toMatch(/tag/i);
    });
  });

  it("[AC-019] tag 1 WORK: exit 1, stderr contains 'lowercase'", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(["tag", "1", "WORK"], { TODO_FILE: todoFile });
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/lowercase/i);
    });
  });

  it("[AC-020] duplicate tag is no-op: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["tag", "1", "work"], env);
      const { exitCode, stdout } = await runCli(["tag", "1", "work"], env);
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
    });
  });

  it("[AC-038] tag with space 'my tag': exit 1", async () => {
    await withTask(async (todoFile) => {
      const { exitCode } = await runCli(["tag", "1", "my tag"], { TODO_FILE: todoFile });
      expect(exitCode).toBe(1);
    });
  });

  it("[AC-039] empty tag '': exit 1, stderr contains 'tag'", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(["tag", "1", ""], { TODO_FILE: todoFile });
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/tag/i);
    });
  });

  it("[AC-043] tag 1 work --json: valid JSON with 'work' in tags, snake_case keys", async () => {
    await withTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(["tag", "1", "work", "--json"], { TODO_FILE: todoFile });
      expect(exitCode).toBe(0);
      let parsed;
      expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
      expect(parsed.tags).toContain("work");
      for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
        expect(parsed).toHaveProperty(key);
      }
    });
  });

  it("[AC-055] tag 99 work: exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["tag", "99", "work"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-058] duplicate tag --json: valid JSON, tag present exactly once, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["tag", "1", "work"], env);
      const { stdout, exitCode } = await runCli(["tag", "1", "work", "--json"], env);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      const workCount = parsed.tags.filter((t) => t === "work").length;
      expect(workCount).toBe(1);
    });
  });
});
