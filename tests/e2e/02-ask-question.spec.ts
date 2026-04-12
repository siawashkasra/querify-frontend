import { test, expect } from "@playwright/test"
import { waitForResult, submitPrompt, openNewChat } from "./helpers"

test.describe("Query execution journey", () => {
  test("User can ask a question and get a result", async ({ page }) => {
    test.setTimeout(120_000)
    await openNewChat(page)

    await submitPrompt(page, "What is my revenue this month?")

    await waitForResult(page)

    await expect(page.getByText(/SQL used/i)).toBeVisible()
  })

  test("SQL disclosure expands and shows SQL", async ({ page }) => {
    test.setTimeout(120_000)
    await openNewChat(page)

    await submitPrompt(page, "How many tables do I have?")

    await waitForResult(page)

    const sqlToggle = page.getByText(/SQL used/i)
    await sqlToggle.click()

    await expect(page.getByText("SELECT").first()).toBeVisible({ timeout: 3_000 })

    const copyBtn = page.getByRole("button", { name: /copy sql/i })
    await expect(copyBtn).toBeVisible()
  })

  test("Thumbs up feedback is recorded", async ({ page }) => {
    test.setTimeout(120_000)
    await openNewChat(page)

    await submitPrompt(page, "Show me all tables")

    await waitForResult(page)

    const thumbsUpBtn = page.locator("[data-testid='result-card']").locator("button").filter({ has: page.locator(".lucide-thumbs-up") }).first()
    await thumbsUpBtn.click()
    await expect(thumbsUpBtn).toHaveClass(/text-success|bg-success/, { timeout: 3_000 })
  })
})
