import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIN = path.resolve(__dirname, "../../bin/smart-todo.js");

export function runCli(args, env = {}) {
  const todoFile = path.join(tmpdir(), `${randomUUID()}.json`);
  return new Promise((resolve) => {
    execFile(
      "node",
      [BIN, ...args],
      {
        env: { ...process.env, TODO_FILE: todoFile, ...env },
        shell: false,
      },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout || "",
          stderr: stderr || "",
          exitCode: err ? (err.code ?? 1) : 0,
          todoFile,
        });
      }
    );
  });
}

export async function removeTempFile(filePath) {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore if already gone
  }
}
