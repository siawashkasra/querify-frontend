import { test, expect } from "@playwright/test"

test.describe("Connection management journey", () => {
  test("Can test connection from settings", async ({ page }) => {
    await page.goto("/settings")

    const testBtn = page.getByRole("button", { name: /test connection/i }).first()
    await expect(testBtn).toBeVisible({ timeout: 10_000 })
    await testBtn.click()

    await expect(page.getByText(/connected|success|ms/i).first()).toBeVisible({ timeout: 15_000 })
  })

  test("Can delete a connection with name confirmation", async ({ page }) => {
    await page.goto("/settings")

    const deleteBtn = page.getByRole("button", { name: /^delete$/i }).first()
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 })
    await deleteBtn.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByText("This cannot be undone.")).toBeVisible()

    const confirmInput = dialog.locator("input")
    const placeholder = await confirmInput.getAttribute("placeholder")
    await confirmInput.fill(placeholder ?? "")

    const confirmBtn = dialog.getByRole("button", { name: /delete permanently/i })
    await expect(confirmBtn).toBeEnabled()
    await confirmBtn.click()

    await expect(dialog).not.toBeVisible({ timeout: 10_000 })
  })
})
