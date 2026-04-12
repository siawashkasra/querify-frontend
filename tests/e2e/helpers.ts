import { type Page, type BrowserContext, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const API = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL?.replace(/:3000/, ":8000") || "http://localhost:8000"
const STATE_FILE = path.join(__dirname, ".auth-state.json")

const TEST_CONN = {
  name: `Test DB ${Date.now()}`,
  host: process.env.TEST_DB_HOST || "db",
  port: process.env.TEST_DB_PORT || "5432",
  database: process.env.TEST_DB_NAME || "querify_dev",
  username: process.env.TEST_DB_USER || "querify",
  password: process.env.TEST_DB_PASS || "querify",
  ssl_mode: "disable",
}

export { TEST_CONN, STATE_FILE }

export async function fillConnectionForm(page: Page, overrides?: Partial<typeof TEST_CONN>) {
  const data = { ...TEST_CONN, ...overrides }
  await page.getByLabel("Connection name").fill(data.name)
  await page.getByLabel("Host").fill(data.host)
  await page.getByLabel("Port").fill(data.port)
  await page.getByLabel("Database name").fill(data.database)
  await page.getByLabel("Username").fill(data.username)
  await page.getByLabel("Password").fill(data.password)
  await page.getByLabel("SSL mode").selectOption(data.ssl_mode)
}

export async function createTestConnection(page: Page): Promise<string> {
  await page.goto("/settings/connections/new")
  await fillConnectionForm(page)

  await page.getByRole("button", { name: /test connection/i }).click()
  await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 15_000 })

  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: /save and connect/i }).click()
  await expect(page.getByText(/reading|introspect|connecting|understanding|ready/i).first()).toBeVisible({ timeout: 20_000 })

  const doneBtn = page.getByRole("button", { name: /go to dashboard/i }).or(page.getByRole("link", { name: /go to dashboard/i }))
  await expect(doneBtn).toBeVisible({ timeout: 120_000 })
  await doneBtn.click()

  await page.waitForURL("**/", { timeout: 10_000 })
  return TEST_CONN.name
}

export async function createConnectionAndSaveState(context: BrowserContext): Promise<string> {
  const page = await context.newPage()
  const name = await createTestConnection(page)
  await context.storageState({ path: STATE_FILE })
  await page.close()
  return name
}

export function cleanStateFile() {
  try { fs.unlinkSync(STATE_FILE) } catch { /* noop */ }
  try { fs.unlinkSync(STATE_FILE.replace(".json", "-name.txt")) } catch { /* noop */ }
}

export async function waitForResult(page: Page) {
  await expect(
    page.locator("[data-testid='result-card']").or(page.getByText(/answered in/i))
  ).toBeVisible({ timeout: 60_000 })
}

export async function clearTestConnections() {
  try {
    const res = await fetch(`${API}/api/v1/connections`)
    if (!res.ok) return
    const conns: { id: string; name: string }[] = await res.json()
    for (const c of conns.filter((x) => x.name.startsWith("Test DB"))) {
      await fetch(`${API}/api/v1/connections/${c.id}`, { method: "DELETE" })
    }
  } catch {
    /* backend may be down */
  }
}

export async function submitPrompt(page: Page, prompt: string) {
  const input = page.getByPlaceholder("Ask anything about your data")
  await expect(input).toBeEnabled({ timeout: 15_000 })
  await input.fill(prompt)
  await page.keyboard.press("Enter")
}

export async function openNewChat(page: Page) {
  await page.goto("/chat/new")
  await page.waitForURL(/\/chat\//)
  const input = page.getByPlaceholder("Ask anything about your data")
  await expect(input).toBeEnabled({ timeout: 15_000 })
}
