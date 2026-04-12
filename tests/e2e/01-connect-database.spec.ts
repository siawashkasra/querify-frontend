import { test, expect } from "@playwright/test"
import { TEST_CONN, fillConnectionForm } from "./helpers"

test.describe("Database connection journey", () => {
  test("User can connect a database successfully", async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto("/settings/connections/new")
    await fillConnectionForm(page)

    await page.getByRole("button", { name: /test connection/i }).click()
    await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 15_000 })

    const nextBtn = page.getByRole("button", { name: "Next", exact: true })
    await expect(nextBtn).toBeEnabled()
    await nextBtn.click()

    await expect(page.getByText(/save and connect/i)).toBeVisible()
    await page.getByRole("button", { name: /save and connect/i }).click()

    await expect(page.getByText(/reading|connecting|understanding|ready/i).first()).toBeVisible({ timeout: 20_000 })

    const doneBtn = page.getByRole("button", { name: /go to dashboard/i }).or(page.getByRole("link", { name: /go to dashboard/i }))
    await expect(doneBtn).toBeVisible({ timeout: 120_000 })
    await doneBtn.click()

    await page.waitForURL("**/", { timeout: 10_000 })
    await expect(page.getByRole("main").getByText(/your database is ready/i)).toBeVisible({ timeout: 10_000 })
  })

  test("Shows correct error for wrong password", async ({ page }) => {
    await page.goto("/settings/connections/new")
    await fillConnectionForm(page, { name: "Bad Pass Test", password: "totally-wrong-password-xyz" })

    await page.getByRole("button", { name: /test connection/i }).click()

    await expect(
      page.getByText(/wrong username|wrong password|auth|credentials|connection failed/i)
    ).toBeVisible({ timeout: 15_000 })

    const nextBtn = page.getByRole("button", { name: "Next", exact: true })
    await expect(nextBtn).toBeDisabled()
  })

  test("Shows correct error for unreachable host", async ({ page }) => {
    test.setTimeout(60_000)
    await page.goto("/settings/connections/new")
    await fillConnectionForm(page, { name: "Bad Host Test", host: "unreachable-host-that-does-not-exist.local", port: "9999", database: "testdb", username: "testuser", password: "testpass" })

    await page.getByRole("button", { name: /test connection/i }).click()

    await expect(
      page.getByText(/could not reach|timeout|timed out|dns|connection failed/i)
    ).toBeVisible({ timeout: 30_000 })

    const nextBtn = page.getByRole("button", { name: "Next", exact: true })
    await expect(nextBtn).toBeDisabled()
  })
})
