import { defineConfig, devices } from "@playwright/test"
import path from "path"

const STATE_FILE = path.join(__dirname, "tests/e2e/.auth-state.json")

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "list" : "html",
  globalTimeout: 600_000,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    storageState: STATE_FILE,
  },
  projects: [
    {
      name: "with-state",
      testIgnore: ["01-connect-database.spec.ts", "10-auth-journey.spec.ts", "11-invitation-journey.spec.ts"],
      use: { ...devices["Desktop Chrome"], storageState: STATE_FILE },
    },
    {
      name: "no-state",
      testMatch: ["01-connect-database.spec.ts", "10-auth-journey.spec.ts", "11-invitation-journey.spec.ts"],
      dependencies: ["with-state"],
      use: { ...devices["Desktop Chrome"], storageState: undefined },
    },
  ],
})
