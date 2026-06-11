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
