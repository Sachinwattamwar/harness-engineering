import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.js", "bin/**/*.js"],
      thresholds: {
        lines: 85,
      },
      reporter: ["text", "json", "html"],
    },
  },
});
