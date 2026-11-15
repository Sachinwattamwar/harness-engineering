import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { runCli, removeTempFile } from "./helpers.js";

describe("add command", () => {
  it("[AC-001] creates task with --title, prints 'Task 1 created.', exit 0, file created", async () => {
    const { stdout, exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "Write tests",
    ]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain("Task 1 created.");
    const stat = await fs.stat(todoFile).catch(() => null);
    expect(stat).not.toBeNull();
    await removeTempFile(todoFile);
  });

  it("[AC-004] 120-char title succeeds, exit 0", async () => {
    const { exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "a".repeat(120),
    ]);
    expect(exitCode).toBe(0);
    await removeTempFile(todoFile);
  });

  it("[AC-005] 121-char title rejected — exit 1, stderr contains '120' and 'character'", async () => {
    const { stderr, exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "a".repeat(121),
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/120/);
    expect(stderr).toMatch(/character/i);
    await removeTempFile(todoFile);
  });

  it("[AC-006] missing --title — exit 1, stderr contains '--title' and 'required'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["add"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/--title/);
    expect(stderr).toMatch(/required/i);
    await removeTempFile(todoFile);
  });

  it("[AC-030] add --json — exit 0, stdout is valid JSON with all 8 snake_case keys", async () => {
    const { stdout, exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "JSON task",
      "--json",
    ]);
    expect(exitCode).toBe(0);
    let parsed;
    expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
    for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
      expect(parsed).toHaveProperty(key);
    }
    await removeTempFile(todoFile);
  });

  it("[AC-034] --priority critical — exit 1, stderr contains 'priority', 'low', 'medium', 'high'", async () => {
    const { stderr, exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "X",
      "--priority",
      "critical",
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/priority/i);
    expect(stderr).toMatch(/low/);
    expect(stderr).toMatch(/medium/);
    expect(stderr).toMatch(/high/);
    await removeTempFile(todoFile);
  });

  it("[AC-040] 11 --tag values — exit 1, stderr contains '10' and 'tag'", async () => {
    const tags = Array.from({ length: 11 }, (_, i) => ["--tag", `t${i + 1}`]).flat();
    const { stderr, exitCode, todoFile } = await runCli(["add", "--title", "X", ...tags]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/10/);
    expect(stderr).toMatch(/tag/i);
    await removeTempFile(todoFile);
  });

  it("[AC-041] --tag WORK — exit 1, stderr contains 'lowercase'", async () => {
    const { stderr, exitCode, todoFile } = await runCli([
      "add",
      "--title",
      "X",
      "--tag",
      "WORK",
    ]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/lowercase/i);
    await removeTempFile(todoFile);
  });

  it("[AC-062] exactly 10 distinct --tag values — task created, exit 0", async () => {
    const tags = Array.from({ length: 10 }, (_, i) => ["--tag", `t${i + 1}`]).flat();
    const { exitCode, todoFile } = await runCli(["add", "--title", "X", ...tags]);
    expect(exitCode).toBe(0);
    await removeTempFile(todoFile);
  });
});
