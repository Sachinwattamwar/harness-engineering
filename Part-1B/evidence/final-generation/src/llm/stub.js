import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = join(__dirname, "../../evals/fixtures/stub-response.json");

export class StubAdapter {
  constructor() {
    this.promptVersion = "v1";
  }

  call(_systemPrompt, _userContent) {
    let output;
    if (process.env.STUB_RESPONSE) {
      output = JSON.parse(process.env.STUB_RESPONSE);
    } else {
      output = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
    }
    return Promise.resolve({
      output,
      meta: {
        provider: "stub",
        model: "stub",
        temperature: 0,
        promptVersion: this.promptVersion,
      },
    });
  }
}
