import { chromium } from "@playwright/test"
import { STATE_FILE, clearTestConnections, createTestConnection, TEST_CONN } from "./helpers"
import * as fs from "fs"

export default async function globalSetup() {
  await clearTestConnections()

  const browser = await chromium.launch()
  const context = await browser.newContext({ baseURL: process.env.BASE_URL || "http://localhost:3000" })
  const page = await context.newPage()

  await createTestConnection(page)

  await context.storageState({ path: STATE_FILE })

  fs.writeFileSync(STATE_FILE.replace(".json", "-name.txt"), TEST_CONN.name)

  await page.close()
  await context.close()
  await browser.close()
}
