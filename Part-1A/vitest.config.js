import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**", "bin/**"],
      thresholds: {
        lines: 85,
      },
      reporter: ["text", "lcov"],
      autoAttachSubprocess: true,
    },
  },
});
