// ─────────────────────────────────────────────────────────────
//  Vitest configuration.
//  Runs tests in a Node environment (not jsdom) since our tests
//  hit the database layer directly, not React components.
// ─────────────────────────────────────────────────────────────
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Node environment — no DOM needed for DB tests
    environment: "node",
    // Allow describe/it/expect as globals (no import needed per-file)
    globals: true,
    // Setup file runs before any tests are imported
    // Sets env vars for in-memory SQLite to ensure test idempotency
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      // Mirrors the "@/*" path alias used in tsconfig.json
      "@": path.resolve(__dirname),
    },
  },
});
