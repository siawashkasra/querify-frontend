import { test, expect } from "@playwright/test"
import { TEST_CONN, fillConnectionForm, submitPrompt, waitForResult } from "./helpers"

test.describe("Phase 3: Onboarding journey", () => {
  test("Complete onboarding from connection to first insight", async ({ page }) => {
    test.setTimeout(180_000)

    await page.goto("/settings/connections/new")
    await fillConnectionForm(page, { name: `Onboarding E2E ${Date.now()}` })

    const emailField = page.getByLabel(/email/i)
    if (await emailField.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await emailField.fill("e2e-test@querify.app")
    }

    await page.getByRole("button", { name: /test connection/i }).click()
    await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 15_000 })

    const nextBtn = page.getByRole("button", { name: "Next", exact: true })
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()

    await expect(page.getByText(/save and connect/i)).toBeVisible()
    await page.getByRole("button", { name: /save and connect/i }).click()

    await expect(
      page.getByText(/reading|schema|understanding|finding|insights|introspect/i).first()
    ).toBeVisible({ timeout: 20_000 })

    const doneIndicator = page
      .getByRole("button", { name: /go to dashboard|ask your first question|start/i })
      .or(page.getByRole("link", { name: /go to dashboard|ask your first question|start/i }))
    await expect(doneIndicator).toBeVisible({ timeout: 120_000 })

    const insightCard = page.locator("[data-testid='insight-card']").or(page.getByText(/insight|found|pattern|trend/i).first())
    const hasInsights = await insightCard.isVisible({ timeout: 5_000 }).catch(() => false)

    const understoodSection = page.getByText(/what I understood|what querify knows/i)
    const hasUnderstood = await understoodSection.isVisible({ timeout: 3_000 }).catch(() => false)

    await doneIndicator.click()

    await page.waitForURL(/\/(chat\/new)?$/, { timeout: 10_000 })

    const chipOrInput = page
      .getByRole("button", { name: /revenue|users|churn|subscription|metric/i })
      .or(page.getByPlaceholder(/ask anything/i))
    await expect(chipOrInput.first()).toBeVisible({ timeout: 15_000 })
  })

  test("Correction is detected and acknowledged in chat", async ({ page }) => {
    test.setTimeout(90_000)

    await page.goto("/dashboard")
    const hasConnection = await page.getByText(/your database is ready/i).isVisible({ timeout: 5_000 }).catch(() => false)
    if (!hasConnection) {
      test.skip(true, "No active connection available for correction test")
      return
    }

    await page.goto("/chat/new")

    const input = page.getByPlaceholder(/ask anything about your data/i)
    await expect(input).toBeEnabled({ timeout: 15_000 })
    await input.fill("actually revenue in our company means subscriptions.amount")
    await page.keyboard.press("Enter")

    const response = page.getByText(/updated my understanding|correction|got it|noted/i)
    await expect(response).toBeVisible({ timeout: 60_000 })

    const tableOrChart = page.locator("table, canvas, [data-testid='result-card']")
    const hasDataViz = await tableOrChart.isVisible({ timeout: 2_000 }).catch(() => false)
    expect(hasDataViz).toBe(false)
  })
})
