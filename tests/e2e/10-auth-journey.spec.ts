import { test, expect } from "@playwright/test"
import {
  DEFAULT_PASSWORD,
  cleanupTestUser,
  fillConnectionForm,
  getVerificationToken,
  logoutViaSession,
  openNewChat,
  submitPrompt,
  waitForResult,
} from "./helpers"

test.describe("Full signup to first query journey", () => {
  test("Full signup to first query journey", async ({ page }) => {
    test.setTimeout(300_000)
    const email = `signup-${Date.now()}@example.com`
    const company = `Signup Co ${Date.now()}`
    try {
      await page.goto("/signup")
      await page.getByLabel("Full name").fill("Signup Journey User")
      await page.getByLabel("Work email").fill(email)
      await page.getByLabel("Password", { exact: true }).fill(DEFAULT_PASSWORD)
      await page.getByLabel("Company name").fill(company)
      await page.locator("#signup-agree").check()
      await page.getByRole("button", { name: /create free account/i }).click()
      await expect(page.getByRole("status", { name: /check your inbox/i })).toBeVisible({ timeout: 15_000 })
      const verifyToken = await getVerificationToken(email)
      await page.goto(`/auth/verify?token=${encodeURIComponent(verifyToken)}`)
      await expect(page.getByRole("status", { name: /email verified/i })).toBeVisible({ timeout: 15_000 })
      await page.waitForURL("**/dashboard", { timeout: 10_000 })
      await expect(page.locator("aside").getByText("QUERIFY")).toBeVisible()
      await expect(page.getByRole("link", { name: "Log in" })).toHaveCount(0)
      await page.goto("/settings/connections/new")
      await fillConnectionForm(page)
      await page.getByRole("button", { name: /test connection/i }).click()
      await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 15_000 })
      await page.getByRole("button", { name: "Next", exact: true }).click()
      await page.getByRole("button", { name: /save and connect/i }).click()
      await expect(page.getByText(/reading|introspect|connecting|understanding|ready/i).first()).toBeVisible({ timeout: 20_000 })
      await openNewChat(page)
      await submitPrompt(page, "How many tables are in my database?")
      await waitForResult(page)
      await logoutViaSession(page)
      await expect(page).toHaveURL(/\/login/)
      await page.goto("/dashboard")
      await expect(page).toHaveURL(/\/login/)
    } finally {
      await cleanupTestUser(email)
    }
  })
})
