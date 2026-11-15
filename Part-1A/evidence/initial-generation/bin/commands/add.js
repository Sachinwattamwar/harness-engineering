import { loadStore, saveStore } from "../../src/store.js";
import { validateTitle, validatePriority, validateTag } from "../../src/validate.js";
import { formatJson, formatConfirmation } from "../../src/format.js";

export function registerAddCommand(program) {
  program
    .command("add")
    .description("Add a new task")
    .requiredOption("--title <title>", "task title")
    .option("--description <desc>", "task description", "")
    .option("--priority <level>", "priority: low, medium, high", "medium")
    .option("--tag <tag>", "tag (repeatable)", (val, prev) => [...prev, val], [])
    .option("--json", "output as JSON")
    .action(async (opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const titleCheck = validateTitle(opts.title);
      if (!titleCheck.valid) {
        process.stderr.write(`Error: ${titleCheck.error}\n`);
        process.exit(1);
      }

      const priCheck = validatePriority(opts.priority);
      if (!priCheck.valid) {
        process.stderr.write(`Error: ${priCheck.error}\n`);
        process.exit(1);
      }

      const uniqueTags = [...new Set(opts.tag)];

      for (const tag of uniqueTags) {
        const tagCheck = validateTag(tag);
        if (!tagCheck.valid) {
          process.stderr.write(`Error: ${tagCheck.error}\n`);
          process.exit(1);
        }
      }

      if (uniqueTags.length > 10) {
        process.stderr.write("Error: maximum 10 tags per task\n");
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

      const now = new Date().toISOString();
      const task = {
        id: store.nextId,
        title: opts.title,
        description: opts.description,
        priority: opts.priority,
        tags: uniqueTags,
        status: "todo",
        created_at: now,
        updated_at: now,
      };
      store.tasks.push(task);
      store.nextId += 1;

      try {
        await saveStore(todoFile, store);
      } catch (err) {
        process.stderr.write(`${err.message}\n`);
        process.exit(3);
      }

      if (opts.json) {
        process.stdout.write(formatJson(task) + "\n");
      } else {
        process.stdout.write(formatConfirmation(`Task ${task.id} created.`) + "\n");
      }
    });
}
