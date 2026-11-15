import { loadStore, saveStore } from "../../src/store.js";
import { validateId } from "../../src/validate.js";
import { formatJson, formatConfirmation } from "../../src/format.js";

export function registerDeleteCommand(program) {
  program
    .command("delete")
    .description("Delete a task")
    .argument("<id>", "task ID")
    .option("--json", "output deleted task as JSON")
    .action(async (id, opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const idCheck = validateId(id);
      if (!idCheck.valid) {
        process.stderr.write(`Error: ${idCheck.error}\n`);
        process.exit(1);
      }

      let store;
      try {
        store = await loadStore(todoFile);
      } catch (err) {
        if (err.code === "VALIDATION_ERROR") {
          process.stderr.write(`${err.message}\n`);
          process.exit(1);
        }
        process.stderr.write(`${err.message}\n`);
        process.exit(3);
      }

      const numId = parseInt(id, 10);
      const idx = store.tasks.findIndex((t) => t.id === numId);
      if (idx === -1) {
        process.stderr.write(`Error: Task ${id} not found\n`);
        process.exit(2);
      }

      const deleted = store.tasks.splice(idx, 1)[0];

      try {
        await saveStore(todoFile, store);
      } catch (err) {
        process.stderr.write(`${err.message}\n`);
        process.exit(3);
      }

      if (opts.json) {
        process.stdout.write(formatJson(deleted) + "\n");
      } else {
        process.stdout.write(formatConfirmation(`Task ${numId} deleted.`) + "\n");
      }
    });
}
