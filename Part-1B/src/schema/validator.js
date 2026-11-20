import Ajv from "ajv";
import addFormats from "ajv-formats";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const schema = require("../../specs/001-nl-reminder-agent/contracts/output-schema.json");

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const validateFn = ajv.compile(schema);

export const SCHEMA_ID = "reminder-output/v1";

export function validate(json) {
  const valid = validateFn(json);
  return { valid, errors: validateFn.errors ?? null };
}
