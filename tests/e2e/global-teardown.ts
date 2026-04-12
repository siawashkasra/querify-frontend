import { clearTestConnections, cleanStateFile } from "./helpers"

export default async function globalTeardown() {
  await clearTestConnections()
  cleanStateFile()
}
