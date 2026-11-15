#!/usr/bin/env node
import { Command } from "commander";
import { registerAddCommand } from "./commands/add.js";
import { registerListCommand } from "./commands/list.js";
import { registerShowCommand } from "./commands/show.js";
import { registerUpdateCommand } from "./commands/update.js";
import { registerDeleteCommand } from "./commands/delete.js";
import { registerTagCommand } from "./commands/tag.js";
import { registerUntagCommand } from "./commands/untag.js";
import { registerStatusCommand } from "./commands/status.js";

// Pre-validate negative integer IDs before commander attempts to parse them as flags.
// Commander treats "-1" as an unknown short option; here it is always an ID argument.
const idCommands = ["show", "update", "delete", "tag", "untag", "status"];
const userArgs = process.argv.slice(2);
const cmdIdx = userArgs.findIndex((arg) => idCommands.includes(arg));
if (cmdIdx !== -1) {
  const afterCmd = userArgs.slice(cmdIdx + 1);
  if (afterCmd.length > 0 && /^-\d+$/.test(afterCmd[0])) {
    process.stderr.write("Error: id must be a positive integer\n");
    process.exit(1);
  }
}

const program = new Command();
program.name("todo").version("1.0.0");

registerAddCommand(program);
registerListCommand(program);
registerShowCommand(program);
registerUpdateCommand(program);
registerDeleteCommand(program);
registerTagCommand(program);
registerUntagCommand(program);
registerStatusCommand(program);

await program.parseAsync(process.argv);
