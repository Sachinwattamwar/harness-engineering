import js from "@eslint/js";
import security from "eslint-plugin-security";
import globals from "globals";

export default [
  {
    ignores: ["coverage/**", "evidence/**", "node_modules/**"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  // Security rules scoped to application code only.
  // Test infrastructure necessarily uses dynamic file paths for temp fixtures,
  // which would generate unavoidable false-positive security/detect-non-literal-fs-filename
  // warnings. Security rules are most valuable on src/ and bin/ where user input
  // could reach security-sensitive operations (FR-036, constitution §V).
  {
    files: ["src/**/*.js", "bin/**/*.js"],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
    },
  },
];
