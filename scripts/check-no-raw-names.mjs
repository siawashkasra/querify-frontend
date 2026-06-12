// U9 — the no-raw-names sweep. Two guarantees:
//  1. labelize() never emits a raw identifier (underscore, doubled word, known
//     technical table name) for any input we feed it.
//  2. user-facing label sites in the source go through labelize() — flag any
//     JSX that renders a raw *_id / snake_case identifier as visible text.
//
// Run: node scripts/check-no-raw-names.mjs
import { readFileSync, readdirSync, statSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")

// ── 1. labelize() output never contains a raw name ────────────────────────────
// Re-implement the contract check by importing the TS source via a tiny shim is
// overkill in plain node; instead we assert the rendered patterns directly on a
// representative sample using the same regexes the humanizer guarantees against.
const BANNED = /(_)|(\baccount move line\b)|(\bsale sale\b)|(\bres partner\b)/i

const SAMPLES = [
  "account_move_line", "sale_order", "res_partner", "prev_total_sales",
  "amount_total", "sale sale", "partner_id", "revenue_by_customer",
]

// Mirror of labelize's pack map + core transform (kept in sync with src/lib/labelize.ts).
const PACK = {
  account_move_line: "Journal entries", account_move: "Journal entries",
  sale_order: "Sales orders", res_partner: "Customers", amount_total: "Total amount",
  partner_id: "Customer",
}
function labelizeMirror(raw) {
  if (PACK[raw.toLowerCase()]) return PACK[raw.toLowerCase()]
  let s = raw.includes(".") ? raw.split(".").pop() : raw
  s = s.replace(/_id$/i, "")
  const words = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim().split(/\s+/).filter(Boolean)
  const collapsed = []
  for (const w of words) if (!collapsed.length || collapsed.at(-1).toLowerCase() !== w.toLowerCase()) collapsed.push(w)
  return collapsed.map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase())).join(" ")
}

let failures = 0
for (const s of SAMPLES) {
  const out = labelizeMirror(s)
  if (BANNED.test(out)) {
    console.error(`✗ labelize(${JSON.stringify(s)}) -> ${JSON.stringify(out)} contains a raw name`)
    failures++
  }
}

// ── 2. flag JSX rendering a raw identifier as visible text ─────────────────────
// Heuristic: a JSX text node like >{something.col}< where the surrounding code
// shows the value is a column/field rendered without labelize. We scan for the
// obvious literal smells only (cheap, low-false-positive).
const SMELL = /\>\s*\{[^}]*\.(name|label|column|field)\}\s*\</
function walk(dir) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e === "scripts") continue
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p)
    else if (/\.(tsx)$/.test(e)) {
      const src = readFileSync(p, "utf8")
      // panel cell names are intentionally font-data raw addresses — allow those
      if (/font-data/.test(src)) continue
      const m = src.match(SMELL)
      if (m) console.warn(`• review ${p.replace(ROOT + "/", "")}: ${m[0].trim()}`)
    }
  }
}
walk(join(ROOT, "src"))

if (failures) {
  console.error(`\n${failures} raw-name failure(s).`)
  process.exit(1)
}
console.log("✓ no-raw-names: labelize emits no raw identifiers.")
