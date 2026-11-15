import { describe, it, expect } from "vitest";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { loadStore, saveStore } from "../../src/store.js";

function tempPath() {
  return path.join(tmpdir(), `${randomUUID()}.json`);
}

describe("loadStore", () => {
  it("returns {nextId:1, tasks:[]} when file does not exist", async () => {
    const p = tempPath();
    const store = await loadStore(p);
    expect(store).toEqual({ nextId: 1, tasks: [] });
  });

  it("[AC-031] throws with file path and 'parse'/'invalid JSON' on corrupt JSON", async () => {
    const p = tempPath();
    await fs.writeFile(p, "{not valid json", "utf8");
    await expect(loadStore(p)).rejects.toMatchObject({
      message: expect.stringMatching(/parse|invalid JSON/i),
    });
    const err = await loadStore(p).catch((e) => e);
    expect(err.message).toContain(p);
    await fs.unlink(p);
  });

  it("[AC-032] throws with file path and 'schema' on wrong schema (bare array)", async () => {
    const p = tempPath();
    await fs.writeFile(p, "[]", "utf8");
    const err = await loadStore(p).catch((e) => e);
    expect(err.message).toMatch(/schema/i);
    expect(err.message).toContain(p);
    await fs.unlink(p);
  });

  it("[AC-050] throws when path contains .. segments", async () => {
    const err = await loadStore("/tmp/../etc/tasks.json").catch((e) => e);
    expect(err).toBeTruthy();
    expect(err.message).toMatch(/\.\.|invalid/i);
  });
});

describe("saveStore", () => {
  it("[AC-056] writes store atomically — no .tmp file remains after save", async () => {
    const p = tempPath();
    const store = { nextId: 2, tasks: [{ id: 1, title: "t" }] };
    await saveStore(p, store);
    const dir = path.dirname(p);
    const base = path.basename(p);
    const files = await fs.readdir(dir);
    const tmpFiles = files.filter(
      (f) => f.startsWith(base) && f !== base
    );
    expect(tmpFiles).toHaveLength(0);
    const written = JSON.parse(await fs.readFile(p, "utf8"));
    expect(written).toEqual(store);
    await fs.unlink(p);
  });

  it("[AC-056] written file has valid {nextId, tasks} structure", async () => {
    const p = tempPath();
    await saveStore(p, { nextId: 3, tasks: [] });
    const data = JSON.parse(await fs.readFile(p, "utf8"));
    expect(data).toHaveProperty("nextId");
    expect(data).toHaveProperty("tasks");
    expect(Array.isArray(data.tasks)).toBe(true);
    await fs.unlink(p);
  });

  it("[AC-057] nextId advances and is never reset by delete", async () => {
    const p = tempPath();
    // Simulate: add 3 tasks (nextId becomes 4), delete task 3
    const store = {
      nextId: 4,
      tasks: [
        { id: 1, title: "a" },
        { id: 2, title: "b" },
      ],
    };
    await saveStore(p, store);
    const loaded = await loadStore(p);
    expect(loaded.nextId).toBe(4);
    expect(loaded.tasks).toHaveLength(2);
    await fs.unlink(p);
  });
});
