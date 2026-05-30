import { type Page, type BrowserContext, expect } from "@playwright/test"
import * as path from "path"
import * as fs from "fs"

const API = process.env.NEXT_PUBLIC_API_URL || process.env.BASE_URL?.replace(/:3000/, ":8000") || "http://localhost:8000"
const STATE_FILE = path.join(__dirname, ".auth-state.json")
const DEFAULT_PASSWORD = "SecurePass1!"
const E2E_SETUP_EMAIL = process.env.E2E_SETUP_EMAIL || "e2e-global-setup@example.com"

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}

const TEST_CONN = {
  name: `Test DB ${Date.now()}`,
  host: process.env.TEST_DB_HOST || "db",
  port: process.env.TEST_DB_PORT || "5432",
  database: process.env.TEST_DB_NAME || "querify_dev",
  username: process.env.TEST_DB_USER || "querify",
  password: process.env.TEST_DB_PASS || "querify",
  ssl_mode: "disable",
}

export { TEST_CONN, STATE_FILE, DEFAULT_PASSWORD, E2E_SETUP_EMAIL, API }

export async function getVerificationToken(email: string): Promise<string> {
  const res = await fetch(`${API}/api/v1/test/auth/get-verification-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(`getVerificationToken failed: ${res.status}`)
  const data = await res.json() as { token: string }
  return data.token
}

export async function getInviteToken(email: string): Promise<string> {
  const res = await fetch(`${API}/api/v1/test/invitations/get-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  if (!res.ok) throw new Error(`getInviteToken failed: ${res.status}`)
  const data = await res.json() as { token: string }
  return data.token
}

export async function cleanupTestUser(email: string): Promise<void> {
  try {
    await fetch(`${API}/api/v1/test/auth/cleanup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
  } catch {
    /* backend may be down */
  }
}

export async function establishAuth(page: Page, tokens: TokenPair): Promise<void> {
  const base = process.env.BASE_URL || "http://localhost:3000"
  await page.context().addCookies([{ name: "qrf_session", value: "1", url: `${base}/` }])
  await page.goto("/")
  await page.evaluate((stored) => {
    localStorage.setItem("querify-auth", JSON.stringify({
      state: {
        accessToken: stored.access_token,
        refreshToken: stored.refresh_token,
        tenantId: null,
        role: null,
      },
      version: 0,
    }))
  }, tokens)
  const session = await page.request.post("/api/auth/session")
  if (!session.ok()) throw new Error(`session failed: ${session.status()}`)
}

export async function apiLogin(email: string, password: string = DEFAULT_PASSWORD): Promise<TokenPair> {
  const res = await fetch(`${API}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`apiLogin failed: ${res.status}`)
  return res.json() as Promise<TokenPair>
}

export async function clearRateLimits(): Promise<void> {
  try {
    await fetch(`${API}/api/v1/test/auth/clear-rate-limits`, { method: "POST" })
  } catch {
    /* backend may be down */
  }
}

export async function ensureE2EAuth(page: Page): Promise<TokenPair> {
  await cleanupTestUser(E2E_SETUP_EMAIL)
  await clearRateLimits()
  const register = await fetch(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: E2E_SETUP_EMAIL,
      password: DEFAULT_PASSWORD,
      name: "E2E Setup User",
      company_name: "E2E Setup Co",
    }),
  })
  if (register.status === 201) {
    const token = await getVerificationToken(E2E_SETUP_EMAIL)
    const verify = await fetch(`${API}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
    if (!verify.ok) throw new Error(`verify failed: ${verify.status}`)
    const tokens = await verify.json() as TokenPair
    await establishAuth(page, tokens)
    await page.goto("/dashboard")
    await expect(page.locator("aside").getByText("QUERIFY")).toBeVisible({ timeout: 15_000 })
    return tokens
  }
  if (register.status === 409) {
    try {
      const tokens = await apiLogin(E2E_SETUP_EMAIL, DEFAULT_PASSWORD)
      await establishAuth(page, tokens)
      await page.goto("/dashboard")
      await expect(page.locator("aside").getByText("QUERIFY")).toBeVisible({ timeout: 15_000 })
      return tokens
    } catch {
      /* fall through to verify pending user */
    }
  }
  if (register.status === 409 || register.status === 429) {
    await clearRateLimits()
    try {
      const token = await getVerificationToken(E2E_SETUP_EMAIL)
      const verify = await fetch(`${API}/api/v1/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      if (verify.ok) {
        const tokens = await verify.json() as TokenPair
        await establishAuth(page, tokens)
        await page.goto("/dashboard")
        await expect(page.locator("aside").getByText("QUERIFY")).toBeVisible({ timeout: 15_000 })
        return tokens
      }
    } catch {
      /* ignore */
    }
  }
  throw new Error(`register failed: ${register.status}`)
}

export async function logoutViaSession(page: Page): Promise<void> {
  const tokens = await page.evaluate(() => {
    const raw = localStorage.getItem("querify-auth")
    if (!raw) return null
    const parsed = JSON.parse(raw) as { state?: { accessToken?: string | null; refreshToken?: string | null } }
    return { access: parsed.state?.accessToken ?? null, refresh: parsed.state?.refreshToken ?? null }
  })
  if (tokens?.access && tokens?.refresh) {
    await fetch(`${API}/api/v1/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokens.access}` },
      body: JSON.stringify({ refresh_token: tokens.refresh }),
    })
  }
  await page.request.delete("/api/auth/session")
  await page.evaluate(() => localStorage.removeItem("querify-auth"))
  await page.goto("/login")
}

export async function fillConnectionForm(page: Page, overrides?: Partial<typeof TEST_CONN>) {
  const data = { ...TEST_CONN, ...overrides }
  if (await page.getByRole("button", { name: /PostgreSQL/i }).isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /PostgreSQL/i }).click()
    await page.getByRole("button", { name: "Next", exact: true }).click()
  }
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
  await page.getByRole("button", { name: /PostgreSQL/i }).click()
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await expect(page.getByLabel("Connection name")).toBeVisible({ timeout: 15_000 })
  await fillConnectionForm(page)

  await page.getByRole("button", { name: /test connection/i }).click()
  await expect(page.getByText(/connected successfully|tables? found/i)).toBeVisible({ timeout: 15_000 })

  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.getByRole("button", { name: /save and connect/i }).click()
  await expect(page.getByText(/reading|connecting|understanding|All done|found in your database/i).first()).toBeVisible({ timeout: 30_000 })
  const finishBtn = page.getByRole("button", { name: /ask your first question|start asking questions|go to dashboard/i })
  await expect(finishBtn).toBeVisible({ timeout: 120_000 })
  await finishBtn.click()
  await page.goto("/dashboard")
  await page.waitForURL("**/dashboard", { timeout: 10_000 })
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

export async function clearTestConnections(accessToken?: string) {
  try {
    const headers: Record<string, string> = {}
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
    const res = await fetch(`${API}/api/v1/connections`, { headers })
    if (!res.ok) return
    const conns: { id: string; name: string }[] = await res.json()
    for (const c of conns.filter((x) => x.name.startsWith("Test DB"))) {
      await fetch(`${API}/api/v1/connections/${c.id}`, { method: "DELETE", headers })
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
