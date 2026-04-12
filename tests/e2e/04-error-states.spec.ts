import { test, expect } from "@playwright/test"
import { submitPrompt, openNewChat, waitForResult } from "./helpers"

test.describe("Error state journey", () => {
  test("Shows zero-result response for empty data", async ({ page }) => {
    test.setTimeout(120_000)
    await openNewChat(page)

    await submitPrompt(page, "How many orders were placed in the year 1800?")

    await waitForResult(page)

    await expect(page.locator("[data-testid='result-card']").getByText(/0|zero|no orders|no results|no data/i).first()).toBeVisible({ timeout: 5_000 })
  })

  test("Shows response for query about non-existent table", async ({ page }) => {
    test.setTimeout(120_000)
    await openNewChat(page)

    await submitPrompt(page, "SELECT * FROM a_table_that_absolutely_does_not_exist_xyz_9999")

    await waitForResult(page)

    await expect(page.locator("[data-testid='result-card']").getByText(/does not exist|not found|no data|zero|error/i).first()).toBeVisible({ timeout: 5_000 })
  })
})
