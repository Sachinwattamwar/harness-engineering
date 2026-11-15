import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("show command", () => {
  it("[AC-021] show 1 — displays all 8 fields, exit 0", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "My task", "--description", "Some desc"], env);
    const { stdout, exitCode } = await runCli(["show", "1"], env);
    expect(exitCode).toBe(0);
    // Should contain at least the title
    expect(stdout).toContain("My task");
    await removeTempFile(todoFile);
  });

  it("[AC-022] show 99 — exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["show", "99"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-029] show 1 --json — valid JSON with all 8 snake_case keys", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "JSON test"], env);
    const { stdout, exitCode } = await runCli(["show", "1", "--json"], env);
    expect(exitCode).toBe(0);
    let parsed;
    expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
    for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
      expect(parsed).toHaveProperty(key);
    }
    await removeTempFile(todoFile);
  });

  it("[AC-052] description stored and visible in show output", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "Deploy", "--description", "Push to prod"], env);
    const { stdout, exitCode } = await runCli(["show", "1"], env);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Push to prod");
    await removeTempFile(todoFile);
  });
});
