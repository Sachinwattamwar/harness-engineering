import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("delete command", () => {
  it("[AC-026] delete 1: stdout 'Task 1 deleted.', exit 0, task absent", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "To delete"], env);
    const { stdout, exitCode } = await runCli(["delete", "1"], env);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Task 1 deleted.");
    // Task should no longer be found
    const { exitCode: showExit } = await runCli(["show", "1"], env);
    expect(showExit).toBe(2);
    await removeTempFile(todoFile);
  });

  it("[AC-027] delete 99: exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["delete", "99"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-048] delete 1 --json: valid JSON representing task before deletion, snake_case keys", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "Will be deleted"], env);
    const { stdout, exitCode } = await runCli(["delete", "1", "--json"], env);
    expect(exitCode).toBe(0);
    let parsed;
    expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
    expect(parsed.title).toBe("Will be deleted");
    for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
      expect(parsed).toHaveProperty(key);
    }
    await removeTempFile(todoFile);
  });
});
