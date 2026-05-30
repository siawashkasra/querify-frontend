import { test, expect } from "@playwright/test"
import { API, DEFAULT_PASSWORD, cleanupTestUser, getInviteToken } from "./helpers"

async function registerAndVerify(email: string, name: string, company: string) {
  const register = await fetch(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEFAULT_PASSWORD, name, company_name: company }),
  })
  expect(register.status).toBe(201)
  const tokenRes = await fetch(`${API}/api/v1/test/auth/get-verification-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  expect(tokenRes.ok).toBeTruthy()
  const { token } = await tokenRes.json() as { token: string }
  const verify = await fetch(`${API}/api/v1/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  })
  expect(verify.ok).toBeTruthy()
  return verify.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

test.describe("Invitation acceptance journey", () => {
  test("Invitation acceptance journey", async ({ page }) => {
    test.setTimeout(180_000)
    const stamp = Date.now()
    const adminEmail = `invite-admin-${stamp}@example.com`
    const guestEmail = `invite-guest-${stamp}@example.com`
    const hostCompany = `Host Co ${stamp}`
    const guestCompany = `Guest Co ${stamp}`
    try {
      const adminTokens = await registerAndVerify(adminEmail, "Invite Admin", hostCompany)
      await registerAndVerify(guestEmail, "Invite Guest", guestCompany)
      const inviteRes = await fetch(`${API}/api/v1/tenant/invitations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminTokens.access_token}`,
        },
        body: JSON.stringify({ email: guestEmail, role: "end_user" }),
      })
      expect(inviteRes.status).toBe(201)
      const inviteToken = await getInviteToken(guestEmail)
      await page.goto(`/auth/accept-invite?token=${encodeURIComponent(inviteToken)}`)
      await page.waitForURL("**/dashboard", { timeout: 15_000 })
      await expect(page.locator("aside").getByText(hostCompany)).toBeVisible({ timeout: 15_000 })
      await page.locator("aside").getByRole("button").filter({ hasText: hostCompany }).click()
      await expect(page.locator("aside").getByRole("button", { name: guestCompany })).toBeVisible({ timeout: 10_000 })
      await page.locator("aside").getByRole("button", { name: guestCompany }).click()
      await page.waitForURL("**/dashboard", { timeout: 15_000 })
      await expect(page.locator("aside").getByText(guestCompany)).toBeVisible({ timeout: 15_000 })
    } finally {
      await cleanupTestUser(adminEmail)
      await cleanupTestUser(guestEmail)
    }
  })
})
