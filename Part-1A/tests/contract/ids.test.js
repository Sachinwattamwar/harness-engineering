import { describe, it, expect } from "vitest";
import { runCli, removeTempFile } from "./helpers.js";

describe("ID format validation", () => {
  it("[AC-036] show abc: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["show", "abc"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-037] show -1: exit 1, stderr contains 'id' or 'positive'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["show", "-1"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|positive/i);
    await removeTempFile(todoFile);
  });

  it("[AC-036] update abc --title X: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["update", "abc", "--title", "X"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-036] delete abc: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["delete", "abc"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-036] tag abc work: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["tag", "abc", "work"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-036] untag abc work: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["untag", "abc", "work"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-036] status abc in_progress: exit 1, stderr contains 'id' or 'integer'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["status", "abc", "in_progress"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|integer/i);
    await removeTempFile(todoFile);
  });

  it("[AC-037] update -1 --title X: exit 1, stderr contains 'id' or 'positive'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["update", "-1", "--title", "X"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|positive/i);
    await removeTempFile(todoFile);
  });

  it("[AC-037] delete -1: exit 1, stderr contains 'id' or 'positive'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["delete", "-1"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|positive/i);
    await removeTempFile(todoFile);
  });

  it("[AC-037] status -1 done: exit 1, stderr contains 'id' or 'positive'", async () => {
    const { stderr, exitCode, todoFile } = await runCli(["status", "-1", "done"]);
    expect(exitCode).toBe(1);
    expect(stderr).toMatch(/id|positive/i);
    await removeTempFile(todoFile);
  });
});
