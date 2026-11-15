import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function withTask(fn) {
  const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
  await runCli(["add", "--title", "Original", "--description", "desc"], { TODO_FILE: todoFile });
  try {
    await fn(todoFile);
  } finally {
    await removeTempFile(todoFile);
  }
}

describe("update command", () => {
  it("[AC-023] update --title 'Revised': confirmation, exit 0, updated_at changed", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      const { stdout: before } = await runCli(["show", "1", "--json"], env);
      const beforeTask = JSON.parse(before);
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      const { exitCode, stdout } = await runCli(["update", "1", "--title", "Revised"], env);
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
      const { stdout: after } = await runCli(["show", "1", "--json"], env);
      const afterTask = JSON.parse(after);
      expect(afterTask.title).toBe("Revised");
      expect(afterTask.updated_at).not.toBe(beforeTask.updated_at);
    });
  });

  it("[AC-024] update --priority high: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const { exitCode } = await runCli(["update", "1", "--priority", "high"], { TODO_FILE: todoFile });
      expect(exitCode).toBe(0);
    });
  });

  it("[AC-025] update --title '': exit 1, stderr contains 'title' and length constraint", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(["update", "1", "--title", ""], { TODO_FILE: todoFile });
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/title/i);
      expect(stderr).toMatch(/120|1 and 120/i);
    });
  });

  it("[AC-047] update with no flags: exit 1, stderr contains 'at least one' or '--title'", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(["update", "1"], { TODO_FILE: todoFile });
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/at least one|--title/i);
    });
  });

  it("[AC-051] update --title 'X' --json: valid JSON, snake_case keys, updated title", async () => {
    await withTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["update", "1", "--title", "X", "--json"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      let parsed;
      expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
      expect(parsed.title).toBe("X");
      for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
        expect(parsed).toHaveProperty(key);
      }
    });
  });

  it("[AC-053] update 99 --title 'X': exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["update", "99", "--title", "X"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-063] update --description '' --json: JSON has description:'', updated_at refreshed", async () => {
    await withTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["update", "1", "--description", "", "--json"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.description).toBe("");
    });
  });
});
