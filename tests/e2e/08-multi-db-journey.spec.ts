/**
 * Multi-database E2E journey tests.
 *
 * MySQL test runs ONLY when E2E_MYSQL_URL is set in the environment.
 * Set it to: mysql://user:pass@host:port/dbname
 *
 * Example:
 *   E2E_MYSQL_URL=mysql://querify:pass@localhost:3306/myapp npx playwright test 08-multi-db-journey
 */
import { test, expect, type Page } from "@playwright/test"
import { waitForResult, submitPrompt } from "./helpers"

const E2E_MYSQL_URL = process.env.E2E_MYSQL_URL

function parseMysqlUrl(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parsed.port || "3306",
    database: parsed.pathname.replace(/^\//, ""),
    username: parsed.username,
    password: parsed.password,
  }
}

async function selectDbType(page: Page, label: RegExp | string) {
  const card = page.getByRole("button", { name: label })
  await expect(card).toBeVisible({ timeout: 10_000 })
  await card.click()
}

async function fillMysqlForm(page: Page, creds: ReturnType<typeof parseMysqlUrl>) {
  await page.getByLabel("Connection name").fill(`MySQL E2E ${Date.now()}`)
  await page.getByLabel("Host").fill(creds.host)
  await page.getByLabel("Port").fill(creds.port)
  await page.getByLabel("Database name").fill(creds.database)
  await page.getByLabel("Username").fill(creds.username)
  await page.getByLabel("Password").fill(creds.password)
}

test.describe("Multi-database connection journey", () => {
  test("Type selector shows all three database cards", async ({ page }) => {
    await page.goto("/settings/connections/new")
    await expect(page.getByRole("button", { name: /postgresql/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("button", { name: /mysql/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /sql server/i })).toBeVisible()
  })

  test("Selecting MySQL auto-fills port 3306", async ({ page }) => {
    await page.goto("/settings/connections/new")
    await selectDbType(page, /mysql/i)
    const nextBtn = page.getByRole("button", { name: /next/i })
    await expect(nextBtn).toBeEnabled({ timeout: 5_000 })
    await nextBtn.click()
    const portField = page.getByLabel("Port")
    await expect(portField).toHaveValue("3306", { timeout: 5_000 })
  })

  test("Selecting SQL Server auto-fills port 1433", async ({ page }) => {
    await page.goto("/settings/connections/new")
    await selectDbType(page, /sql server/i)
    const nextBtn = page.getByRole("button", { name: /next/i })
    await expect(nextBtn).toBeEnabled({ timeout: 5_000 })
    await nextBtn.click()
    const portField = page.getByLabel("Port")
    await expect(portField).toHaveValue("1433", { timeout: 5_000 })
  })

  test("Next button is disabled until a database type is selected", async ({ page }) => {
    await page.goto("/settings/connections/new")
    const nextBtn = page.getByRole("button", { name: /next/i })
    await expect(nextBtn).toBeDisabled({ timeout: 5_000 })
    await selectDbType(page, /postgresql/i)
    await expect(nextBtn).toBeEnabled()
  })

  test(
    "MySQL connection end to end",
    async ({ page }) => {
      if (!E2E_MYSQL_URL) {
        test.skip()
        return
      }
      test.setTimeout(180_000)

      const creds = parseMysqlUrl(E2E_MYSQL_URL)

      await page.goto("/settings/connections/new")
      await expect(page.getByRole("button", { name: /postgresql/i })).toBeVisible({ timeout: 10_000 })
      await expect(page.getByRole("button", { name: /mysql/i })).toBeVisible()
      await expect(page.getByRole("button", { name: /sql server/i })).toBeVisible()

      await selectDbType(page, /mysql/i)
      const nextBtn = page.getByRole("button", { name: /next/i })
      await expect(nextBtn).toBeEnabled({ timeout: 5_000 })
      await nextBtn.click()

      await expect(page.getByLabel("Port")).toHaveValue("3306", { timeout: 5_000 })

      await fillMysqlForm(page, creds)

      await page.getByRole("button", { name: /test connection/i }).click()
      await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 30_000 })

      const reviewNextBtn = page.getByRole("button", { name: /next/i })
      await expect(reviewNextBtn).toBeEnabled()
      await reviewNextBtn.click()

      await page.getByRole("button", { name: /save and connect/i }).click()
      await expect(page.getByText(/reading|connecting|understanding|ready/i).first()).toBeVisible({ timeout: 20_000 })

      const doneBtn = page.getByRole("button", { name: /go to dashboard/i }).or(page.getByRole("link", { name: /go to dashboard/i }))
      await expect(doneBtn).toBeVisible({ timeout: 120_000 })
      await doneBtn.click()

      await page.waitForURL("**/", { timeout: 10_000 })

      await page.goto("/chat/new")
      await page.waitForURL(/\/chat\//)

      await submitPrompt(page, "How many users do I have?")
      await waitForResult(page)

      const sqlDisclosure = page.getByRole("button", { name: /view sql|show sql|sql/i }).first()
      if (await sqlDisclosure.isVisible()) {
        await sqlDisclosure.click()
        const sqlContent = await page.locator("pre, code").first().textContent() || ""
        expect(sqlContent.toLowerCase()).not.toContain("date_trunc")
      }
    }
  )
})
