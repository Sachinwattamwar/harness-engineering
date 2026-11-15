import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function withStore(fn) {
  const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
  try {
    await fn(todoFile);
  } finally {
    await removeTempFile(todoFile);
  }
}

describe("list command", () => {
  it("[AC-003] empty store — non-error empty message, exit 0", async () => {
    const { exitCode, stderr } = await runCli(["list"]);
    expect(exitCode).toBe(0);
    expect(stderr).toBe("");
  });

  it("[AC-061] empty store --json — stdout '[]', exit 0", async () => {
    const { stdout, exitCode } = await runCli(["list", "--json"]);
    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout)).toEqual([]);
  });

  it("[AC-002] tasks sorted high → medium → low", async () => {
    await withStore(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["add", "--title", "Low task", "--priority", "low"], env);
      await runCli(["add", "--title", "High task", "--priority", "high"], env);
      await runCli(["add", "--title", "Med task", "--priority", "medium"], env);
      const { stdout, exitCode } = await runCli(["list"], env);
      expect(exitCode).toBe(0);
      const highIdx = stdout.indexOf("High task");
      const medIdx = stdout.indexOf("Med task");
      const lowIdx = stdout.indexOf("Low task");
      expect(highIdx).toBeLessThan(medIdx);
      expect(medIdx).toBeLessThan(lowIdx);
    });
  });

  it("[AC-028] list --json — valid JSON array with snake_case keys", async () => {
    await withStore(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["add", "--title", "A"], env);
      const { stdout, exitCode } = await runCli(["list", "--json"], env);
      expect(exitCode).toBe(0);
      let arr;
      expect(() => { arr = JSON.parse(stdout); }).not.toThrow();
      expect(Array.isArray(arr)).toBe(true);
      expect(arr.length).toBeGreaterThan(0);
      for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
        expect(arr[0]).toHaveProperty(key);
      }
    });
  });

  it("[AC-016] AND-filter: --tag work --tag urgent returns only task with both tags", async () => {
    await withStore(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      // Task 1: work + urgent
      await runCli(["add", "--title", "Task One", "--tag", "work", "--tag", "urgent"], env);
      // Task 2: work only
      await runCli(["add", "--title", "Task Two", "--tag", "work"], env);
      const { stdout, exitCode } = await runCli(
        ["list", "--tag", "work", "--tag", "urgent"],
        env
      );
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Task One");
      expect(stdout).not.toContain("Task Two");
    });
  });

  it("[AC-017] no tasks match --tag nonexistent — empty list, exit 0", async () => {
    await withStore(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["add", "--title", "A"], env);
      const { exitCode, stderr } = await runCli(["list", "--tag", "nonexistent"], env);
      expect(exitCode).toBe(0);
      expect(stderr).toBe("");
    });
  });

  it("[AC-045] tasks with same priority and same created_at ordered by id ascending", async () => {
    await withStore(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      // Add two medium tasks rapidly (may share created_at second)
      await runCli(["add", "--title", "First medium"], env);
      await runCli(["add", "--title", "Second medium"], env);
      const { stdout, exitCode } = await runCli(["list"], env);
      expect(exitCode).toBe(0);
      const firstIdx = stdout.indexOf("First medium");
      const secondIdx = stdout.indexOf("Second medium");
      // first task (id=1) should appear before second task (id=2)
      expect(firstIdx).toBeLessThan(secondIdx);
    });
  });
});
