/**
 * schema-validator.js — compiles reminder-output/v1 JSON Schema with Ajv.
 * Covers: INV-001, INV-009, FR-005
 */
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(
  __dirname,
  "..",
  "specs",
  "001-nl-reminder-agent",
  "contracts",
  "output-schema.json"
);

const schema = JSON.parse(readFileSync(schemaPath, "utf8"));

// allErrors:true removed — semgrep flags it as DoS risk (rule: ajv-allerrors-true).
// Unlimited error-object allocation on adversarial input could exhaust memory.
// The harness only needs pass/fail; the first validation error is sufficient.
const ajv = new Ajv({ strict: false });
addFormats(ajv);

const compiledValidator = ajv.compile(schema);

/**
 * Validates a JSON object against reminder-output/v1.
 * @param {unknown} json - The object to validate.
 * @returns {{ valid: boolean, errors: import('ajv').ErrorObject[] | null }}
 */
export function validateOutput(json) {
  const valid = compiledValidator(json);
  return { valid, errors: compiledValidator.errors ?? null };
}

export const SCHEMA_ID = "reminder-output/v1";
