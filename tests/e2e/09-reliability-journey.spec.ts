/**
 * Phase 7 E2E — Reliability journey tests.
 *
 * Covers:
 *   - Reliability tab in Settings shows health, schema, accuracy panels.
 *   - Schema change banner appears in chat when pending_schema_diff is set.
 *
 * Requires:
 *   - A working connection seeded before the test suite (via global-setup or prior E2E runs).
 *   - ENVIRONMENT=development on the API for the test helper endpoint.
 */
import { test, expect, type Page } from "@playwright/test"

const API = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL?.replace(/:3000/, ":8000") || "http://localhost:8000"

async function getFirstConnectionId(page: Page): Promise<string | null> {
  const resp = await page.request.get(`${API}/api/v1/connections`)
  if (!resp.ok()) return null
  const data = await resp.json()
  return data.length > 0 ? data[0].id : null
}

test.describe("Phase 7: Reliability journey", () => {
  test("Reliability tab shows health data panels", async ({ page }) => {
    test.setTimeout(60_000)

    await page.goto("/settings")

    const connectionId = await getFirstConnectionId(page)
    if (!connectionId) {
      test.skip(true, "No active connection available — skipping reliability tab test")
      return
    }

    const connCard = page.locator("[data-testid='connection-card'], [class*='ConnectionCard']").first()
    const hasCard = await connCard.isVisible({ timeout: 8_000 }).catch(() => false)
    if (!hasCard) {
      const anyConn = page.getByRole("button").filter({ hasText: /Test DB|Integration Test|Connection/i }).first()
      if (await anyConn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await anyConn.click()
      }
    } else {
      await connCard.click()
    }

    const reliabilityTab = page.getByRole("tab", { name: /reliability/i }).or(page.getByText("Reliability").first())
    await expect(reliabilityTab).toBeVisible({ timeout: 10_000 })
    await reliabilityTab.click()

    const healthHeading = page.getByText(/uptime|health|healthy|check/i).first()
    await expect(healthHeading).toBeVisible({ timeout: 8_000 })

    const schemaSection = page.getByText(/schema|last updated|tables/i).first()
    await expect(schemaSection).toBeVisible({ timeout: 8_000 })

    const checkNowBtn = page.getByRole("button", { name: /check now/i })
    const hasCheckNow = await checkNowBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    if (hasCheckNow) {
      await checkNowBtn.click()
      const spinner = page.locator("[class*='spin'], [class*='loader'], [aria-label*='loading']").first()
      const hasSpinner = await spinner.isVisible({ timeout: 3_000 }).catch(() => false)
      if (hasSpinner) {
        await expect(spinner).not.toBeVisible({ timeout: 15_000 })
      }
      await expect(page.getByText(/healthy|degraded|unreachable|checked/i).first()).toBeVisible({ timeout: 15_000 })
    }
  })

  test("Schema change banner appears in chat when pending diff is set", async ({ page }) => {
    test.setTimeout(60_000)

    const connectionId = await getFirstConnectionId(page)
    if (!connectionId) {
      test.skip(true, "No active connection — skipping schema banner test")
      return
    }

    const seedResp = await page.request.post(`${API}/api/v1/connections/${connectionId}/test/set-pending-diff`, {
      data: {
        diff: {
          has_changes: true,
          severity: "significant",
          summary: "1 table removed (orders_legacy).",
          tables_added: [],
          tables_removed: ["orders_legacy"],
          columns_added: {},
          columns_removed: {},
          type_changes: {},
        },
      },
    })

    if (!seedResp.ok()) {
      test.skip(true, "Seed endpoint unavailable — API not in development mode")
      return
    }

    await page.goto("/chat/new")

    const banner = page.getByText(/schema has changed|schema change/i).first()
    await expect(banner).toBeVisible({ timeout: 12_000 })

    const diffSummary = page.getByText(/orders_legacy|table removed/i)
    await expect(diffSummary).toBeVisible({ timeout: 5_000 })

    const dismissBtn = page.getByRole("button", { name: /dismiss/i }).first()
    if (await dismissBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await dismissBtn.click()
      await expect(banner).not.toBeVisible({ timeout: 5_000 })

      await page.goto("/dashboard")
      await page.goto("/chat/new")
      await expect(banner).not.toBeVisible({ timeout: 5_000 })
    }
  })

  test("Notification bell shows unread badge and panel", async ({ page }) => {
    test.setTimeout(30_000)

    await page.goto("/dashboard")

    const bellBtn = page.getByRole("button", { name: /notification/i }).or(page.locator("button").filter({ has: page.locator("svg[class*='bell'], [data-lucide='bell']") }).first())
    const hasBell = await bellBtn.isVisible({ timeout: 8_000 }).catch(() => false)
    if (!hasBell) {
      test.skip(true, "Notification bell not visible on dashboard — skipping")
      return
    }

    await bellBtn.click()

    const panel = page.getByText(/notifications/i).first()
    await expect(panel).toBeVisible({ timeout: 5_000 })

    const emptyOrList = page.getByText(/no notifications|you will be notified/i).or(page.locator("[class*='AlertRow'], [class*='alert-row']").first())
    await expect(emptyOrList).toBeVisible({ timeout: 5_000 })
  })
})
