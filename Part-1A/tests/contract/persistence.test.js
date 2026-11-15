import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import { promises as fs } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

describe("persistence and edge cases", () => {
  it("[AC-031] malformed JSON file: any command exits 3, stderr contains file path and 'parse'/'invalid JSON', file unchanged", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    await fs.writeFile(todoFile, "{not valid json", "utf8");
    const original = await fs.readFile(todoFile, "utf8");
    const { stderr, exitCode } = await runCli(["list"], { TODO_FILE: todoFile });
    expect(exitCode).toBe(3);
    expect(stderr).toContain(todoFile);
    expect(stderr).toMatch(/parse|invalid JSON/i);
    const unchanged = await fs.readFile(todoFile, "utf8");
    expect(unchanged).toBe(original);
    await removeTempFile(todoFile);
  });

  it("[AC-032] wrong schema (bare array): exit 3, stderr contains file path and 'schema', file unchanged", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    await fs.writeFile(todoFile, "[]", "utf8");
    const original = await fs.readFile(todoFile, "utf8");
    const { stderr, exitCode } = await runCli(["list"], { TODO_FILE: todoFile });
    expect(exitCode).toBe(3);
    expect(stderr).toContain(todoFile);
    expect(stderr).toMatch(/schema/i);
    const unchanged = await fs.readFile(todoFile, "utf8");
    expect(unchanged).toBe(original);
    await removeTempFile(todoFile);
  });

  it("[AC-033] TODO_FILE parent dir absent: write command exits 3, stderr contains file path", async () => {
    const todoFile = `/tmp/nonexistent-dir-${randomUUID()}/tasks.json`;
    const { stderr, exitCode } = await runCli(["add", "--title", "X"], { TODO_FILE: todoFile });
    expect(exitCode).toBe(3);
    expect(stderr).toContain(todoFile);
  });

  it("[AC-050] TODO_FILE with .. segments: exit 1, stderr contains '..' or 'invalid'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["list"], {
      TODO_FILE: "/tmp/../../etc/tasks.json",
    });
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/\.\.|invalid/i);
    await removeTempFile(todoFile);
  });

  it("[AC-054] duplicate --tag in add: show --json has tag exactly once", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "X", "--tag", "work", "--tag", "work"], env);
    const { stdout } = await runCli(["show", "1", "--json"], env);
    const task = JSON.parse(stdout);
    const workCount = task.tags.filter((t) => t === "work").length;
    expect(workCount).toBe(1);
    await removeTempFile(todoFile);
  });

  it("[AC-056] after add, no .tmp file remains in store directory", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "X"], env);
    const dir = path.dirname(todoFile);
    const base = path.basename(todoFile);
    const files = await fs.readdir(dir);
    const tmpFiles = files.filter((f) => f.startsWith(base) && f !== base);
    expect(tmpFiles).toHaveLength(0);
    const content = JSON.parse(await fs.readFile(todoFile, "utf8"));
    expect(content).toHaveProperty("nextId");
    expect(content).toHaveProperty("tasks");
    await removeTempFile(todoFile);
  });

  it("[AC-057] deleted ID not reused: add 3, delete 3, add → new id=4", async () => {
    const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
    const env = { TODO_FILE: todoFile };
    await runCli(["add", "--title", "Task A"], env);
    await runCli(["add", "--title", "Task B"], env);
    await runCli(["add", "--title", "Task C"], env);
    await runCli(["delete", "3"], env);
    await runCli(["add", "--title", "Task D"], env);
    const { exitCode: show4 } = await runCli(["show", "4"], env);
    expect(show4).toBe(0);
    const { exitCode: show3, stderr: stderr3 } = await runCli(["show", "3"], env);
    expect(show3).toBe(2);
    expect(stderr3).toContain("3");
    expect(stderr3).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });
});
