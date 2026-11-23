import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import { DateTime } from "luxon";
import { validate } from "./schema/validator.js";
import { validateTimezone } from "./dates/resolver.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_PATH = join(__dirname, "../prompts/v3.txt");
const PROMPT_VERSION = "v3";

const WEEKDAY_NAMES = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/;

export class PreflightError extends Error {
  constructor(message) {
    super(message);
    this.name = "PreflightError";
  }
}

export class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "ValidationError";
    this.errors = errors;
  }
}

export async function run({ text, referenceNow, timezone = "Asia/Kolkata" }) {
  // Resolve adapter eagerly so test mock overrides are consumed regardless of pre-flight outcome
  const { createAdapter } = await import("./llm/adapter.js");
  const adapter = createAdapter();

  if (!text || text.length > 2000) {
    throw new PreflightError(
      `Text must be 1–2000 characters (got ${text?.length ?? 0})`
    );
  }

  if (
    !referenceNow ||
    !ISO_WITH_OFFSET.test(referenceNow) ||
    !DateTime.fromISO(referenceNow, { setZone: true }).isValid
  ) {
    throw new PreflightError(
      "--now must be a valid ISO-8601 datetime with explicit UTC offset (e.g. 2026-11-15T09:00:00+05:30)"
    );
  }

  try {
    validateTimezone(timezone);
  } catch {
    throw new PreflightError(
      `Invalid timezone: "${timezone}". Must be a valid IANA timezone string.`
    );
  }

  const systemPrompt = readFileSync(PROMPT_PATH, "utf8");

  const ref = DateTime.fromISO(referenceNow, { setZone: true });
  const weekdayName = WEEKDAY_NAMES[ref.weekday] ?? "";
  const userMessage = [
    `referenceNow: ${referenceNow} (${weekdayName})`,
    `timezone: ${timezone}`,
    `request: ${text}`,
  ].join("\n");
  const { output, meta } = await adapter.call(systemPrompt, userMessage);

  const { valid, errors } = validate(output);
  if (!valid) {
    throw new ValidationError("LLM output failed schema validation", errors);
  }

  return { output, meta: { ...meta, promptVersion: PROMPT_VERSION } };
}
