import { loadStore, saveStore } from "../../src/store.js";
import { validateId, validateTitle, validatePriority } from "../../src/validate.js";
import { formatJson, formatConfirmation } from "../../src/format.js";

export function registerUpdateCommand(program) {
  program
    .command("update")
    .description("Update a task's fields")
    .argument("<id>", "task ID")
    .option("--title <title>", "new title")
    .option("--description <desc>", "new description")
    .option("--priority <level>", "new priority: low, medium, high")
    .option("--json", "output as JSON")
    .action(async (id, opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const idCheck = validateId(id);
      if (!idCheck.valid) {
        process.stderr.write(`Error: ${idCheck.error}\n`);
        process.exit(1);
      }

      if (opts.title === undefined && opts.description === undefined && opts.priority === undefined) {
        process.stderr.write("Error: at least one of --title, --description, or --priority must be specified\n");
        process.exit(1);
      }

      if (opts.title !== undefined) {
        const titleCheck = validateTitle(opts.title);
        if (!titleCheck.valid) {
          process.stderr.write(`Error: ${titleCheck.error}\n`);
          process.exit(1);
        }
      }

      if (opts.priority !== undefined) {
        const priCheck = validatePriority(opts.priority);
        if (!priCheck.valid) {
          process.stderr.write(`Error: ${priCheck.error}\n`);
          process.exit(1);
        }
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
      const task = store.tasks.find((t) => t.id === numId);
      if (!task) {
        process.stderr.write(`Error: Task ${id} not found\n`);
        process.exit(2);
      }

      if (opts.title !== undefined) task.title = opts.title;
      if (opts.description !== undefined) task.description = opts.description;
      if (opts.priority !== undefined) task.priority = opts.priority;
      task.updated_at = new Date().toISOString();

      try {
        await saveStore(todoFile, store);
      } catch (err) {
        process.stderr.write(`${err.message}\n`);
        process.exit(3);
      }

      if (opts.json) {
        process.stdout.write(formatJson(task) + "\n");
      } else {
        process.stdout.write(formatConfirmation(`Task ${numId} updated.`) + "\n");
      }
    });
}
