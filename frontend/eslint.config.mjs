import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Tiered strictness:
//   - hard errors stay as errors and block the verify gate.
//   - "legacy debt" rules (massively violated in code written before the
//     strict-CI cutover) are downgraded to warnings so they're visible but
//     not blocking. Tighten back to "error" once each backlog is cleared.
const legacyDebtToWarn = {
  "@typescript-eslint/no-explicit-any": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  "react-hooks/set-state-in-effect": "warn",
  "react-hooks/exhaustive-deps": "warn",
  "react-hooks/immutability": "warn",
  "react-hooks/refs": "warn",
  "react-hooks/purity": "warn",
  "react-hooks/preserve-manual-memoization": "warn",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: legacyDebtToWarn,
  },
]);

export default eslintConfig;
