import { loadOrExit } from "../../src/loader.js";
import { validateId } from "../../src/validate.js";
import { formatJson, formatTaskDetail } from "../../src/format.js";

export function registerShowCommand(program) {
  program
    .command("show")
    .description("Show details of a task")
    .argument("<id>", "task ID")
    .option("--json", "output as JSON")
    .action(async (id, opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const idCheck = validateId(id);
      if (!idCheck.valid) {
        process.stderr.write(`Error: ${idCheck.error}\n`);
        process.exit(1);
      }

      const store = await loadOrExit(todoFile);

      const numId = parseInt(id, 10);
      const task = store.tasks.find((t) => t.id === numId);
      if (!task) {
        process.stderr.write(`Error: Task ${id} not found\n`);
        process.exit(2);
      }

      if (opts.json) {
        process.stdout.write(formatJson(task) + "\n");
      } else {
        process.stdout.write(formatTaskDetail(task) + "\n");
      }
    });
}
