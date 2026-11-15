import { loadStore, saveStore } from "../../src/store.js";
import { validateId, validateTag } from "../../src/validate.js";
import { formatJson, formatConfirmation } from "../../src/format.js";

export function registerUntagCommand(program) {
  program
    .command("untag")
    .description("Remove a tag from a task")
    .argument("<id>", "task ID")
    .argument("<tag>", "tag to remove")
    .option("--json", "output as JSON")
    .action(async (id, tag, opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const idCheck = validateId(id);
      if (!idCheck.valid) {
        process.stderr.write(`Error: ${idCheck.error}\n`);
        process.exit(1);
      }

      const tagCheck = validateTag(tag);
      if (!tagCheck.valid) {
        process.stderr.write(`Error: ${tagCheck.error}\n`);
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
      const task = store.tasks.find((t) => t.id === numId);
      if (!task) {
        process.stderr.write(`Error: Task ${id} not found\n`);
        process.exit(2);
      }

      if (!task.tags.includes(tag)) {
        if (opts.json) {
          process.stdout.write(formatJson(task) + "\n");
        } else {
          process.stdout.write(formatConfirmation(`Task ${numId} does not have tag '${tag}'.`) + "\n");
        }
        process.exit(0);
      }

      task.tags = task.tags.filter((t) => t !== tag);
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
        process.stdout.write(formatConfirmation(`Tag '${tag}' removed from task ${numId}.`) + "\n");
      }
    });
}
