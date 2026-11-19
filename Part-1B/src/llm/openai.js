// Stub — implementation in /speckit-implement (Phase 2, T020)
export class OpenAIAdapter {
  constructor(_opts) {}
  async call(_systemPrompt, _userContent) {
    throw new Error("Not implemented");
  }
}

export class AdapterError extends Error {
  constructor(message, _opts = {}) {
    super(message);
    this.name = "AdapterError";
  }
}
