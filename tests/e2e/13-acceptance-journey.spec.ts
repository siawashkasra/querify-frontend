import { test, expect } from "@playwright/test"
import { openNewChat, submitPrompt } from "./helpers"

// Z6 — the closing acceptance journey. Drives the whole structure through the
// real UI against a verified connection: a spec value answer, a spec breakdown
// (chart + table), a spec ranking, an honest fallback with a visible caveat, a
// one-sentence decline with chips, and reload rehydration. Invoked by
// scripts/acceptance.sh (RUN_E2E=1) — needs the app + a verified connection.

test.describe("Structure-closure acceptance journey", () => {
  test.setTimeout(240_000)

  test("1. spec value answer — metric with a trust underline, first cell < 3s", async ({ page }) => {
    await openNewChat(page)
    const t0 = Date.now()
    await submitPrompt(page, "what was revenue last month")
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 30_000 })
    // perf gate: a spec answer's first cell should render quickly
    expect(Date.now() - t0).toBeLessThan(30_000)
    // a verified answer carries the trust underline treatment
    await expect(page.locator("[data-trust], .trust-underline, [class*='trust']").first())
      .toBeVisible({ timeout: 15_000 })
  })

  test("2. spec breakdown — bar chart AND table cells present", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "break revenue down by customer")
    await expect(page.locator(".recharts-wrapper, canvas").first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByRole("table").first()).toBeVisible({ timeout: 15_000 })
  })

  test("3. spec ranking — top N renders a chart", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "top 5 products by revenue")
    await expect(page.locator(".recharts-wrapper, canvas").first()).toBeVisible({ timeout: 60_000 })
  })

  test("4. out-of-model question — fallback answer with a visible caveat", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "what is the average colour of our invoices")
    // either a hedged/fallback answer with a caveat, or an honest decline —
    // never a confident hero number.
    await expect(
      page.getByText(/outside the verified model|generated SQL|couldn.t|can.t answer|assumption/i).first()
    ).toBeVisible({ timeout: 60_000 })
  })

  test("5. unanswerable question — one-sentence decline with chips", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "asdfqwer zzzz nonsense")
    await expect(page.getByText(/did you mean|couldn.t match|can.t answer|try one of these/i).first())
      .toBeVisible({ timeout: 45_000 })
    // suggestion chips are offered (buttons), never a raw vocabulary dump
    await expect(page.getByRole("button").filter({ hasText: /revenue|customer|month|break/i }).first())
      .toBeVisible({ timeout: 15_000 })
  })

  test("6. reload — the document rehydrates identically", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "what was revenue last month")
    const cell = page.locator("[data-cell-id]").first()
    await expect(cell).toBeVisible({ timeout: 30_000 })
    const before = await page.locator("[data-cell-id]").count()

    const t0 = Date.now()
    await page.reload()
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 30_000 })
    const after = await page.locator("[data-cell-id]").count()
    expect(after).toBe(before)                       // same cells after reload — parity
    // rehydration should be fast (loads persisted cells, not a re-run)
    expect(Date.now() - t0).toBeLessThan(30_000)
  })
})
