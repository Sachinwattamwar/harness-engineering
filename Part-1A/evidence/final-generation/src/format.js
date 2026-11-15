export function formatJson(data) {
  return JSON.stringify(data, null, 2);
}

export function formatTable(tasks) {
  if (tasks.length === 0) {
    return "No tasks found.";
  }
  const header = `${"ID".padEnd(5)} ${"Title".padEnd(42)} ${"Priority".padEnd(10)} ${"Status".padEnd(12)} ${"Tags".padEnd(25)} Updated`;
  const sep = "-".repeat(header.length);
  const rows = tasks.map((t) => {
    const id = String(t.id).padEnd(5);
    const title = t.title.slice(0, 42).padEnd(42);
    const priority = t.priority.padEnd(10);
    const status = t.status.padEnd(12);
    const tags = (t.tags || []).join(",").slice(0, 25).padEnd(25);
    const updated = t.updated_at.slice(0, 10);
    return `${id} ${title} ${priority} ${status} ${tags} ${updated}`;
  });
  return [header, sep, ...rows].join("\n");
}

export function formatTaskDetail(task) {
  const fields = [
    ["id", String(task.id)],
    ["title", task.title],
    ["description", task.description !== undefined ? task.description : ""],
    ["priority", task.priority],
    ["tags", (task.tags || []).join(", ")],
    ["status", task.status],
    ["created_at", task.created_at],
    ["updated_at", task.updated_at],
  ];
  return fields.map(([k, v]) => `${k.padEnd(14)} ${v}`).join("\n");
}

export function formatConfirmation(msg) {
  return msg;
}
