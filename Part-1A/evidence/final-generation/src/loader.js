import { loadStore, saveStore } from "./store.js";

export async function loadOrExit(todoFile) {
  try {
    return await loadStore(todoFile);
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    process.stderr.write(`${err.message}\n`);
    process.exit(3);
  }
}

export async function saveOrExit(todoFile, store) {
  try {
    await saveStore(todoFile, store);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(3);
  }
}
