import { loadOrExit } from "../../src/loader.js";
import { formatJson, formatTable } from "../../src/format.js";

function priorityValue(p) {
  if (p === "high") return 3;
  if (p === "medium") return 2;
  return 1;
}

export function registerListCommand(program) {
  program
    .command("list")
    .description("List all tasks")
    .option("--tag <tag>", "filter by tag (AND semantics, repeatable)", (val, prev) => [...prev, val], [])
    .option("--json", "output as JSON")
    .action(async (opts) => {
      const todoFile = process.env.TODO_FILE || "./tasks.json";

      const store = await loadOrExit(todoFile);

      let tasks = store.tasks;

      if (opts.tag.length > 0) {
        tasks = tasks.filter((t) =>
          opts.tag.every((tag) => t.tags.includes(tag))
        );
      }

      tasks = tasks.slice().sort((a, b) => {
        const pa = priorityValue(a.priority);
        const pb = priorityValue(b.priority);
        if (pb !== pa) return pb - pa;
        return a.created_at !== b.created_at ? (a.created_at < b.created_at ? -1 : 1) : (a.id - b.id);
      });

      if (opts.json) {
        process.stdout.write(formatJson(tasks) + "\n");
      } else {
        process.stdout.write(formatTable(tasks) + "\n");
      }
    });
}
