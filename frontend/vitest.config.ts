import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Vitest configuration for the frontend smoke tests.
 *
 * The project still ships through Next.js + webpack for prod; Vitest only runs
 * the small set of unit tests under `**\/*.test.{ts,tsx}` and resolves the
 * same `@/` alias the rest of the codebase uses.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "dist/**"],
    css: false,
  },
});
