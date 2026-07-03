import { defineConfig } from "vitest/config"
import path from "node:path"

// Z5 — fast unit guard for the frontend criticals (store reducers, chart-cell
// presence + rehydration, labelize sweep). Pure logic, node env — no jsdom needed
// yet; browser-render coverage stays in the Playwright e2e suite.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: false,
  },
})
