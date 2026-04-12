import { test, expect } from "@playwright/test"
import { waitForResult, submitPrompt, openNewChat } from "./helpers"

test.describe("Query history journey", () => {
  const PROMPT_A = "What is my revenue this month?"

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000)
    const ctx = await browser.newContext({ storageState: "tests/e2e/.auth-state.json" })
    const page = await ctx.newPage()

    await openNewChat(page)
    await submitPrompt(page, PROMPT_A)
    await waitForResult(page)

    await page.close()
    await ctx.close()
  })

  test("Query appears in history after execution", async ({ page }) => {
    await page.goto("/history")

    await expect(page.getByText(PROMPT_A.slice(0, 30)).first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/success/i).first()).toBeVisible()
  })

  test("Can search history by prompt text", async ({ page }) => {
    await page.goto("/history")
    await expect(page.getByText(PROMPT_A.slice(0, 30)).first()).toBeVisible({ timeout: 10_000 })

    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill("revenue")

    await expect(page.getByText(PROMPT_A.slice(0, 30)).first()).toBeVisible()
  })

  test("Ask again from history creates new session", async ({ page }) => {
    await page.goto("/history")
    await expect(page.getByText(PROMPT_A.slice(0, 30)).first()).toBeVisible({ timeout: 10_000 })

    const row = page.getByText(PROMPT_A.slice(0, 30)).first()
    await row.hover()

    const askAgain = page.getByRole("button", { name: /ask again/i }).first()
    if (await askAgain.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await askAgain.click()
    } else {
      await row.click()
      await page.getByRole("button", { name: /ask again/i }).first().click()
    }

    await page.waitForURL(/\/chat\//, { timeout: 15_000 })
    await expect(page.getByText(PROMPT_A.slice(0, 20)).first()).toBeVisible({ timeout: 10_000 })
  })
})
