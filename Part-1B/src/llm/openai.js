import OpenAI from "openai";
// Import error classes from the subpath so they resolve from the real SDK even when
// vi.mock("openai") is active in tests. vi.mock intercepts only the "openai" specifier,
// not subpaths, so "openai/error.mjs" always provides the real class references.
import {
  APIConnectionError,
  APIUserAbortError,
  NotFoundError,
} from "openai/error.mjs";
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
  // Raw error shapes used by existing tests (plain Error objects with explicit properties).
  if (err.name === "AbortError") return true;
  if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") return true;

  // SDK (openai 4.x) wraps ECONNREFUSED/ENOTFOUND in APIConnectionError; raw code on cause.
  if (err.cause?.code === "ECONNREFUSED" || err.cause?.code === "ENOTFOUND") return true;

  // SDK error classes (production).
  // APIUserAbortError — thrown when options.signal.aborted at fetch time; in this adapter
  //   AbortSignal.timeout(30000) is the only signal, so every APIUserAbortError is our 30s
  //   timeout, not a deliberate user abort.
  // APIConnectionTimeoutError — SDK internal timeout; subclass of APIConnectionError, so the
  //   check below covers it.
  // APIConnectionError — wraps all network-layer failures (ECONNREFUSED etc.).
  if (err instanceof APIUserAbortError) return true;
  if (err instanceof APIConnectionError) return true;

  // HTTP status codes.
  if (err.status === 429) return true;
  if (err.status >= 500 && err.status < 600) return true;

  // Unknown / missing model — FR-020 lists this explicitly.
  // SDK throws NotFoundError (HTTP 404) with err.code === "model_not_found".
  // Scope to that specific code so other 404s stay non-retryable.
  if (err instanceof NotFoundError && err.code === "model_not_found") return true;
  if (err.status === 404 && err.code === "model_not_found") return true;

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
    // maxRetries: 0 — disable SDK-level retries so FR-020's 3-attempt budget is
    // controlled entirely by our loop, not split between two retry mechanisms.
    // Support both class constructor (production) and factory mock (Vitest 5.x).
    try {
      this.client = new OpenAI({ maxRetries: 0 });
    } catch {
      this.client = OpenAI({ maxRetries: 0 });
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
