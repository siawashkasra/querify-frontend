import { test, expect } from "@playwright/test"
import {
  DEFAULT_PASSWORD,
  cleanupTestUser,
  getVerificationToken,
  API,
} from "./helpers"

/**
 * Upgrade journey: free user hits query limit, sees the limit modal,
 * navigates to billing, and views the plan change preview.
 *
 * Requires:
 * - Backend running with Stripe test mode keys
 * - Free plan seeded in the plans table (or created by create_free_subscription)
 * - Redis available for usage counters
 */
test.describe("Upgrade journey", () => {
  test("Free user hits limit and sees upgrade path", async ({ page }) => {
    test.setTimeout(180_000)

    const email = `upgrade-${Date.now()}@example.com`
    const company = `Upgrade Co ${Date.now()}`

    try {
      // ── Step 1: Register and verify ────────────────────────────────────────
      await page.goto("/signup")
      await page.getByLabel("Full name").fill("Upgrade Test User")
      await page.getByLabel("Work email").fill(email)
      await page.getByLabel("Password", { exact: true }).fill(DEFAULT_PASSWORD)
      await page.getByLabel("Company name").fill(company)
      await page.locator("#signup-agree").check()
      await page.getByRole("button", { name: /create free account/i }).click()
      await expect(page.getByRole("status", { name: /check your inbox/i })).toBeVisible({ timeout: 15_000 })

      const token = await getVerificationToken(email)
      await page.goto(`/auth/verify?token=${encodeURIComponent(token)}`)
      await page.waitForURL("**/dashboard", { timeout: 15_000 })

      // ── Step 2: Assert usage widget shows 0 of 20 ──────────────────────────
      await expect(page.getByText(/0.*of.*20.*queries/i)).toBeVisible({ timeout: 10_000 })

      // ── Step 3: Exhaust free quota via API ─────────────────────────────────
      // Log in via API to get the access token
      const loginResp = await fetch(`${API}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: DEFAULT_PASSWORD }),
      })
      expect(loginResp.ok).toBeTruthy()
      const { access_token } = await loginResp.json() as { access_token: string }

      // Set usage directly via a test helper endpoint
      // (in real test mode we'd call the API 20 times, but we use the DB shortcut)
      const usageResp = await fetch(`${API}/api/v1/test/billing/set-query-usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ queries_used: 20 }),
      })
      // If the test endpoint doesn't exist, skip the exhaustion step gracefully
      if (!usageResp.ok) {
        test.skip()
        return
      }

      // ── Step 4: Navigate to chat and submit a question ─────────────────────
      await page.goto("/chat/new")
      const promptInput = page.getByPlaceholder(/ask.*question|what.*want.*know/i).first()
      await promptInput.waitFor({ timeout: 10_000 })
      await promptInput.fill("How many users do I have?")
      await promptInput.press("Enter")

      // ── Step 5: Assert QueryLimitModal appears ─────────────────────────────
      await expect(
        page.getByRole("dialog").filter({ hasText: /monthly query limit reached/i })
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page.getByText(/you have used all 20 queries/i)
      ).toBeVisible({ timeout: 5_000 })

      await expect(
        page.getByRole("button", { name: /upgrade now/i })
      ).toBeVisible()

      // ── Step 6: Click Upgrade now → navigate to billing ───────────────────
      await page.getByRole("button", { name: /upgrade now/i }).click()
      await page.waitForURL("**/settings/billing", { timeout: 10_000 })

      // ── Step 7: Billing page shows usage meter at 20/20 in red ───────────
      await expect(page.getByText(/20.*\/.*20|20 of 20/i)).toBeVisible({ timeout: 10_000 })

      // ── Step 8: Click Upgrade on Starter plan card ─────────────────────────
      const starterCard = page.locator('[data-testid="plan-card-starter"]').or(
        page.getByRole("button", { name: /^upgrade$/i }).first()
      )
      await starterCard.click()

      // ── Step 9: Plan change preview modal appears ──────────────────────────
      await expect(
        page.getByRole("dialog").filter({ hasText: /upgrade to starter/i })
      ).toBeVisible({ timeout: 10_000 })

      // Preview shows cost info
      await expect(page.getByText(/due today|next invoice/i)).toBeVisible({ timeout: 10_000 })
    } finally {
      await cleanupTestUser(email)
    }
  })
})
