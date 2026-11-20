import OpenAI from "openai";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const outputSchema = require("../../specs/001-nl-reminder-agent/contracts/output-schema.json");

export class AdapterError extends Error {
  constructor(message, { retryable = false, attempts = 1, cause } = {}) {
    super(message);
    this.name = "AdapterError";
    this.retryable = retryable;
    this.attempts = attempts;
    this.cause = cause;
  }
}

function isRetryable(err) {
  if (err.name === "AbortError") return true;
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") return true;
  if (err.status === 429) return true;
  if (err.status >= 500 && err.status < 600) return true;
  return false;
}

const RETRY_BASE_MS = process.env.VITEST ? 0 : 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_ATTEMPTS = 3;

export class OpenAIAdapter {
  constructor({ model = "gpt-4o-mini", promptVersion = "v1" } = {}) {
    this.model = model;
    this.promptVersion = promptVersion;
    // Support both class constructor (production) and factory mock (Vitest 5.x)
    try {
      this.client = new OpenAI();
    } catch {
      this.client = OpenAI();
    }
  }

  async call(systemPrompt, userContent) {
    let lastErr;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const response = await this.client.chat.completions.create(
          {
            model: this.model,
            temperature: 0,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "reminder_output",
                strict: true,
                schema: outputSchema,
              },
            },
          },
          { signal: AbortSignal.timeout(30000) }
        );

        const content = response.choices[0].message.content;
        const output = JSON.parse(content);

        return {
          output,
          meta: {
            provider: "openai",
            model: this.model,
            temperature: 0,
            promptVersion: this.promptVersion,
          },
        };
      } catch (err) {
        lastErr = err;
        const retryable = isRetryable(err);

        if (!retryable || attempt >= MAX_ATTEMPTS - 1) {
          throw new AdapterError(err.message, {
            retryable,
            attempts: attempt + 1,
            cause: err,
          });
        }

        await sleep(RETRY_BASE_MS * Math.pow(2, attempt));
      }
    }

    throw new AdapterError(lastErr?.message ?? "Unknown error", {
      retryable: true,
      attempts: MAX_ATTEMPTS,
      cause: lastErr,
    });
  }
}
