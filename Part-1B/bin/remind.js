#!/usr/bin/env node
import "dotenv/config";
import { program } from "commander";
import { run, PreflightError, ValidationError } from "../src/agent.js";
import { AdapterError } from "../src/llm/openai.js";

program
  .name("remind")
  .description("NL Reminder Agent CLI")
  .argument("<text>", "Natural language reminder request")
  .option("--now <iso>", "Reference datetime (ISO-8601 with explicit UTC offset)")
  .option("--timezone <iana>", "IANA timezone (default: Asia/Kolkata)", "Asia/Kolkata")
  .action(async (text, options) => {
    try {
      const { output } = await run({
        text,
        referenceNow: options.now,
        timezone: options.timezone,
      });
      process.stdout.write(JSON.stringify(output) + "\n");
      process.exit(0);
    } catch (err) {
      if (err instanceof AdapterError) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(4);
      }
      if (err instanceof PreflightError || err instanceof ValidationError) {
        process.stderr.write(`Error: ${err.message}\n`);
        process.exit(1);
      }
      process.stderr.write(`Error: ${err.message}\n`);
      process.exit(1);
    }
  });

program.parse();
