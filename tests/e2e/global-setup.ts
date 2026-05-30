import { chromium } from "@playwright/test"
import { STATE_FILE, clearTestConnections, createTestConnection, ensureE2EAuth, TEST_CONN } from "./helpers"
import * as fs from "fs"

export default async function globalSetup() {
  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: process.env.BASE_URL || "http://localhost:3000" })
  const page = await context.newPage()

  const tokens = await ensureE2EAuth(page)
  await clearTestConnections(tokens.access_token)
  await page.goto("/dashboard")
  await createTestConnection(page)

  await context.storageState({ path: STATE_FILE })

  fs.writeFileSync(STATE_FILE.replace(".json", "-name.txt"), TEST_CONN.name)

  await page.close()
  await context.close()
  await browser.close()
}
