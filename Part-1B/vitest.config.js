import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,eslint,prettier}.config.*",
      "evidence/**",
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js", "bin/**/*.js"],
      exclude: ["evidence/**"],
      thresholds: {
        lines: 85,
      },
      reporter: ["text", "json", "html"],
      autoAttachSubprocess: true,
    },
  },
});
