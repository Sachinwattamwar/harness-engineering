import { loadOrExit, saveOrExit } from "../../src/loader.js";
import { validateId } from "../../src/validate.js";
import { formatJson, formatConfirmation } from "../../src/format.js";

const VALID_STATUSES = ["todo", "in_progress", "done"];

function allowedNextStatuses(current) {
  if (current === "todo") return ["in_progress"];
  if (current === "in_progress") return ["done", "todo"];
  return [];
}

export function registerStatusCommand(program) {
  program
    .command("status")
    .description("Change a task's status")
    .argument("<id>", "task ID")
    .argument("<status>", "new status: todo, in_progress, done")
    .option("--json", "output as JSON")
    .action(async (id, newStatus, opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const idCheck = validateId(id);
      if (!idCheck.valid) {
        process.stderr.write(`Error: ${idCheck.error}\n`);
        process.exit(1);
      }

      if (!VALID_STATUSES.includes(newStatus)) {
        process.stderr.write(`Error: status must be one of: todo, in_progress, done\n`);
        process.exit(1);
      }

      const store = await loadOrExit(todoFile);

      const numId = parseInt(id, 10);
      const task = store.tasks.find((t) => t.id === numId);
      if (!task) {
        process.stderr.write(`Error: Task ${id} not found\n`);
        process.exit(2);
      }

      if (task.status === newStatus) {
        if (opts.json) {
          process.stdout.write(formatJson(task) + "\n");
        } else {
          process.stdout.write(formatConfirmation(`Task ${numId} status is already '${newStatus}'.`) + "\n");
        }
        process.exit(0);
      }

      const allowed = allowedNextStatuses(task.status);
      if (!allowed.includes(newStatus)) {
        process.stderr.write(
          `Error: invalid transition from '${task.status}' to '${newStatus}'\n`
        );
        process.exit(1);
      }

      task.status = newStatus;
      task.updated_at = new Date().toISOString();

      await saveOrExit(todoFile, store);

      if (opts.json) {
        process.stdout.write(formatJson(task) + "\n");
      } else {
        process.stdout.write(formatConfirmation(`Task ${numId} status changed to '${newStatus}'.`) + "\n");
      }
    });
}
