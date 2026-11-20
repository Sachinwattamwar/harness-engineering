import { OpenAIAdapter, AdapterError } from "./openai.js";
import { StubAdapter } from "./stub.js";

export { AdapterError };

export function createAdapter() {
  const provider = process.env.LLM_PROVIDER ?? "openai";
  const model = process.env.LLM_MODEL ?? "gpt-4o-mini";

  if (provider === "openai") {
    return new OpenAIAdapter({ model });
  }
  if (provider === "stub") {
    return new StubAdapter();
  }
  throw new Error(`Unknown LLM_PROVIDER: "${provider}"`);
}
