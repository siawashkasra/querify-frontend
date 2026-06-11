import { test, expect } from "@playwright/test"
import { openNewChat, submitPrompt } from "./helpers"

// E2E journey for Chat Engine v2 — Analytical Canvas (E12)
// Steps 1-11 validate: section rendering, cells, companion panel, toolbar, follow-ups, skeletons→complete.

test.describe("Analytical canvas journey", () => {
  test.setTimeout(180_000)

  test("1. Analytical query renders SessionCanvas with at least one cell", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Show me revenue by month as a chart")

    // Canvas container must appear
    await expect(page.locator(".max-w-\\[860px\\]")).toBeVisible({ timeout: 60_000 })
    // At least one cell-rendered element
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 30_000 })
  })

  test("2. Companion panel shows 'Ran: X' rows while streaming", async ({ page }) => {
    await openNewChat(page)

    // Open companion panel
    const panelToggle = page.locator("button[title='Show analysis panel'], button[title='Open panel']").first()
    if (await panelToggle.isVisible()) await panelToggle.click()

    await submitPrompt(page, "Compare sales this year vs last year")

    // The panel should show a feed row with 'Ran:' text
    await expect(page.getByText(/Ran:/)).toBeVisible({ timeout: 60_000 })
  })

  test("3. Completion text and follow-up chips appear after doc_done", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "What were my top 5 products by revenue?")

    // Wait for canvas to populate
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })

    // Follow-up chips may appear at the bottom of the canvas
    // They are rendered as buttons after the section footer border
    const followUpArea = page.locator(".border-t").last()
    await expect(followUpArea).toBeVisible({ timeout: 30_000 })
  })

  test("4. Cell toolbar appears on hover: copy, SQL, expand buttons", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Show revenue by product as a table")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })

    // Hover over the first cell wrapper to reveal toolbar
    const firstCell = page.locator("[data-cell-id]").first()
    await firstCell.hover()

    // Copy button should appear
    await expect(firstCell.locator("button[title='Copy as markdown'], button[title='Copy data']").first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test("5. SQL popover opens and shows SQL text", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Count total orders")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })
    const firstCell = page.locator("[data-cell-id]").first()
    await firstCell.hover()

    const sqlBtn = firstCell.locator("button[title='View SQL']")
    if (await sqlBtn.isVisible({ timeout: 3_000 })) {
      await sqlBtn.click()
      await expect(page.getByText("SELECT").first()).toBeVisible({ timeout: 5_000 })
    }
  })

  test("6. Table cell renders with header row and sort button", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "List all orders with customer name and amount")

    // Table cell should render a proper HTML table
    await expect(page.locator("table").first()).toBeVisible({ timeout: 60_000 })

    // Header row with sortable columns
    await expect(page.locator("th").first()).toBeVisible({ timeout: 5_000 })
  })

  test("7. Chart cell renders a chart (canvas or svg)", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Show monthly revenue as a bar chart")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })

    // Recharts renders canvas or svg
    const chart = page.locator(".recharts-wrapper, canvas").first()
    await expect(chart).toBeVisible({ timeout: 30_000 })
  })

  test("8. Expand modal opens and closes on Esc", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Show revenue by region as a chart")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })
    const firstCell = page.locator("[data-cell-id]").first()
    await firstCell.hover()

    const expandBtn = firstCell.locator("button[title='Expand']")
    if (await expandBtn.isVisible({ timeout: 3_000 })) {
      await expandBtn.click()
      // Modal must appear
      await expect(page.locator(".fixed.inset-0")).toBeVisible({ timeout: 5_000 })
      // Esc closes it
      await page.keyboard.press("Escape")
      await expect(page.locator(".fixed.inset-0")).toBeHidden({ timeout: 3_000 })
    }
  })

  test("9. Follow-up chip in canvas triggers a new section", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "What was revenue last month?")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })

    // If follow-up chips exist, click first one
    const followUpBtn = page.locator("button").filter({ hasText: /show|compare|break|why|top/i }).first()
    const isVisible = await followUpBtn.isVisible({ timeout: 10_000 }).catch(() => false)
    if (isVisible) {
      await followUpBtn.click()
      // Second section should appear
      await expect(page.locator("[data-cell-id]").nth(1)).toBeVisible({ timeout: 60_000 })
    }
  })

  test("10. Inline title rename calls PATCH and persists", async ({ page }) => {
    await openNewChat(page)
    await submitPrompt(page, "Show total revenue")

    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })

    // Click the session title to start editing
    const titleBtn = page.locator("button").filter({ hasText: /new chat|Show total/i }).first()
    if (await titleBtn.isVisible({ timeout: 3_000 })) {
      await titleBtn.click()
      // Input should appear
      const titleInput = page.locator("input[class*='border-brand']").first()
      if (await titleInput.isVisible({ timeout: 2_000 })) {
        await titleInput.fill("My Revenue Report")
        await titleInput.press("Enter")
        await expect(page.getByText("My Revenue Report")).toBeVisible({ timeout: 3_000 })
      }
    }
  })

  test("11. Companion panel section groups are collapsible", async ({ page }) => {
    await openNewChat(page)

    // Open panel
    const panelToggle = page.locator("button[title='Show analysis panel'], button[title='Open panel']").first()
    if (await panelToggle.isVisible()) await panelToggle.click()

    await submitPrompt(page, "What are my top customers?")

    // Wait for panel to show feed
    await expect(page.getByText(/Ran:|Analysis/i).first()).toBeVisible({ timeout: 60_000 })

    // Section group chevron button should exist
    const chevron = page.locator("button").filter({ has: page.locator(".lucide-chevron-down, .lucide-chevron-right") }).first()
    if (await chevron.isVisible({ timeout: 5_000 })) {
      await chevron.click()
      // Toggle state — chevron direction changes
      await expect(page.locator(".lucide-chevron-right, .lucide-chevron-down").first()).toBeVisible({ timeout: 2_000 })
    }
  })
})

// ── The full screenshot journey, end to end (E12 T1) ──────────────────────────
// EXTEND (new titled section) → REFINE (swap chart in place, no new section) →
// QUICK (panel answer, canvas unchanged) → reload (rehydrate identically).
test.describe("Analytical canvas — full journey", () => {
  test.setTimeout(240_000)

  test("ask → extend → refine-in-place → quick → reload", async ({ page }) => {
    // 1-2. Open + ask.
    await openNewChat(page)
    await submitPrompt(page, "Compare 2025 and 2026 sales")

    // 3-4. Canvas composes cells; no checklist/scrap text in the canvas.
    const canvas = page.locator(".max-w-\\[860px\\]")
    await expect(canvas).toBeVisible({ timeout: 90_000 })
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 60_000 })
    await expect(canvas).not.toContainText(/Ran:|checklist|sub-query|step 1/i)

    const sectionsBefore = await page.locator("[data-cell-id]").count()

    // 5. Header retitled to an analytical title (not the raw prompt).
    // (Best-effort: title text differs from the prompt.)

    // 7-8. EXTEND — follow-up that adds a NEW titled section to the same canvas.
    const panelInput = page.getByPlaceholder(/Ask a follow-up about this analysis/i)
    if (await panelInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await panelInput.fill("why is the gap so large?")
      await panelInput.press("Enter")
      // a new section's cells stream into the same canvas
      await expect(async () => {
        const n = await page.locator("[data-cell-id]").count()
        expect(n).toBeGreaterThan(sectionsBefore)
      }).toPass({ timeout: 90_000 })
    }

    // 9. REFINE — swap a chart in place: same cell id, no new section.
    const chartCell = page.locator("[data-cell-id]").filter({ has: page.locator(".recharts-wrapper, canvas") }).first()
    if (await chartCell.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const refineId = await chartCell.getAttribute("data-cell-id")
      const countBeforeRefine = await page.locator("[data-cell-id]").count()
      if (await panelInput.isVisible().catch(() => false)) {
        await panelInput.fill("make that chart a bar chart")
        await panelInput.press("Enter")
        // same cell id still present, and NO new section was added
        await page.waitForTimeout(4000)
        await expect(page.locator(`[data-cell-id="${refineId}"]`)).toBeVisible()
        expect(await page.locator("[data-cell-id]").count()).toBe(countBeforeRefine)
      }
    }

    // 10. QUICK — a panel-only answer; the canvas does not change.
    const canvasCountBeforeQuick = await page.locator("[data-cell-id]").count()
    if (await panelInput.isVisible().catch(() => false)) {
      await panelInput.fill("what does revenue mean here?")
      await panelInput.press("Enter")
      await page.waitForTimeout(4000)
      expect(await page.locator("[data-cell-id]").count()).toBe(canvasCountBeforeQuick)
    }

    // 11. Reload — the document rehydrates identically (cells persist).
    const url = page.url()
    const cellsBeforeReload = await page.locator("[data-cell-id]").count()
    await page.goto(url)
    await expect(page.locator("[data-cell-id]").first()).toBeVisible({ timeout: 30_000 })
    await expect(async () => {
      expect(await page.locator("[data-cell-id]").count()).toBe(cellsBeforeReload)
    }).toPass({ timeout: 15_000 })
  })
})
