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

describe("status command", () => {
  it("[AC-007] todo → in_progress: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["status", "1", "in_progress"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
    });
  });

  it("[AC-008] in_progress → done: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      const { exitCode } = await runCli(["status", "1", "done"], env);
      expect(exitCode).toBe(0);
    });
  });

  it("[AC-009] in_progress → todo: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      const { exitCode } = await runCli(["status", "1", "todo"], env);
      expect(exitCode).toBe(0);
    });
  });

  it("[AC-010] todo → done: exit 1, stderr contains 'invalid transition', 'todo', 'done'", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(
        ["status", "1", "done"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/invalid transition/i);
      expect(stderr).toContain("todo");
      expect(stderr).toContain("done");
    });
  });

  it("[AC-011] done → todo: exit 1, stderr contains 'invalid transition', 'done', 'todo'", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      await runCli(["status", "1", "done"], env);
      const { stderr, exitCode } = await runCli(["status", "1", "todo"], env);
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/invalid transition/i);
      expect(stderr).toContain("done");
      expect(stderr).toContain("todo");
    });
  });

  it("[AC-012] done → in_progress: exit 1, stderr contains 'invalid transition', 'done', 'in_progress'", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      await runCli(["status", "1", "done"], env);
      const { stderr, exitCode } = await runCli(["status", "1", "in_progress"], env);
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/invalid transition/i);
      expect(stderr).toContain("done");
      expect(stderr).toContain("in_progress");
    });
  });

  it("[AC-013] non-existent id=99: exit 2, stderr contains '99' and 'not found'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["status", "99", "done"]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain("99");
    expect(stderr).toMatch(/not found/i);
    await removeTempFile(todoFile);
  });

  it("[AC-035] invalid status 'archived': exit 1, stderr contains 'status', 'todo', 'in_progress', 'done'", async () => {
    await withTask(async (todoFile) => {
      const { stderr, exitCode } = await runCli(
        ["status", "1", "archived"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(1);
      expect(stderr).toMatch(/status/i);
      expect(stderr).toContain("todo");
      expect(stderr).toContain("in_progress");
      expect(stderr).toContain("done");
    });
  });

  it("[AC-042] valid transition --json: valid JSON object with updated status, snake_case keys", async () => {
    await withTask(async (todoFile) => {
      const { stdout, exitCode } = await runCli(
        ["status", "1", "in_progress", "--json"],
        { TODO_FILE: todoFile }
      );
      expect(exitCode).toBe(0);
      let parsed;
      expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
      expect(parsed.status).toBe("in_progress");
      for (const key of ["id", "title", "description", "priority", "tags", "status", "created_at", "updated_at"]) {
        expect(parsed).toHaveProperty(key);
      }
    });
  });

  it("[AC-049] same-status no-op: confirmation, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      const { exitCode, stdout } = await runCli(["status", "1", "in_progress"], env);
      expect(exitCode).toBe(0);
      expect(stdout.trim().length).toBeGreaterThan(0);
    });
  });

  it("[AC-060] same-status no-op --json: valid JSON object, exit 0", async () => {
    await withTask(async (todoFile) => {
      const env = { TODO_FILE: todoFile };
      await runCli(["status", "1", "in_progress"], env);
      const { stdout, exitCode } = await runCli(["status", "1", "in_progress", "--json"], env);
      expect(exitCode).toBe(0);
      let parsed;
      expect(() => { parsed = JSON.parse(stdout); }).not.toThrow();
      expect(parsed.status).toBe("in_progress");
    });
  });
});
