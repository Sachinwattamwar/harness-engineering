import { promises as fs } from "node:fs";
import path from "node:path";

export async function loadStore(filePath) {
  const parts = filePath.split("/");
  if (parts.includes("..")) {
    throw { code: "VALIDATION_ERROR", message: `${filePath}: path contains .. segments which are invalid` };
  }

  const resolved = path.resolve(filePath);

  let raw;
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- validated: no .. segments; resolved to absolute path
    raw = await fs.readFile(resolved, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") {
      return { nextId: 1, tasks: [] };
    }
    throw { code: "STORAGE_ERROR", message: `${resolved}: ${err.message}` };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw { code: "STORAGE_ERROR", message: `${resolved}: parse error — invalid JSON` };
  }

  if (
    typeof data !== "object" ||
    data === null ||
    Array.isArray(data) ||
    !Number.isInteger(data.nextId) ||
    data.nextId < 1 ||
    !Array.isArray(data.tasks)
  ) {
    throw { code: "STORAGE_ERROR", message: `${resolved}: schema mismatch — expected {nextId, tasks}` };
  }

  return data;
}

export async function saveStore(filePath, store) {
  const resolved = path.resolve(filePath);
  const tmp = `${resolved}.tmp`;
  const content = JSON.stringify(store, null, 2);

  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- filePath validated before saveStore is called; atomic write pattern
    await fs.writeFile(tmp, content, "utf8");
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- atomic rename to final path
    await fs.rename(tmp, resolved);
  } catch (err) {
    throw { code: "STORAGE_ERROR", message: `${resolved}: ${err.message}` };
  }
}
