// U5/U9 — the single humanizer. Snake_case column names, raw table names, and
// internal prefixes are banned from anything a user reads (headers, captions,
// legends, chips). Everything that displays a field name runs through labelize().
//
// U9 enriches this with the per-pack display map; U5 ships the core humanizer.

// Common acronyms that should stay upper-cased.
const ACRONYMS = new Set([
  "id", "url", "sku", "api", "sql", "csv", "vat", "tax", "aov", "arpu", "mrr",
  "arr", "kpi", "ltv", "cac", "roi", "usd", "eur", "gbp", "ytd", "mtd", "qtd",
])

// Internal prefixes stripped before humanizing (e.g. prev_total_sales → sales).
const STRIP_PREFIXES = ["prev_", "previous_", "current_", "cur_", "raw_", "tmp_", "_"]

// U9 — the Odoo pack display map. Known technical table/field names get a
// business name; nothing on screen should ever say account_move_line.
const PACK_DISPLAY: Record<string, string> = {
  account_move_line: "Journal entries",
  account_move: "Journal entries",
  account_partial_reconcile: "Reconciliations",
  sale_order: "Sales orders",
  sale_order_line: "Order lines",
  purchase_order: "Purchase orders",
  purchase_order_line: "Purchase lines",
  res_partner: "Customers",
  res_users: "Users",
  res_company: "Companies",
  product_template: "Products",
  product_product: "Product variants",
  stock_move: "Stock moves",
  stock_valuation_layer: "Stock valuation",
  account_payment: "Payments",
  crm_lead: "Leads",
  amount_total: "Total amount",
  amount_untaxed: "Untaxed amount",
  partner_id: "Customer",
  user_id: "Salesperson",
  date_order: "Order date",
}

// Per-field display overrides — pack map seeds it; registerLabels() extends it.
const DISPLAY_OVERRIDES: Record<string, string> = { ...PACK_DISPLAY }

// Collapse immediate duplicate words ("sale sale" -> "sale", "order order").
function collapseRepeats(words: string[]): string[] {
  const out: string[] = []
  for (const w of words) {
    if (out.length && out[out.length - 1].toLowerCase() === w.toLowerCase()) continue
    out.push(w)
  }
  return out
}

/**
 * Humanize a raw field/column/table name for display (Sentence case).
 * `revenue_by_customer` → "Revenue by customer"; `account_move_line` → "Journal
 * entries" (pack map); `sale sale` → "Sale"; `prev_total_sales` → "Total sales".
 */
export function labelize(raw: string | null | undefined): string {
  if (raw == null) return ""
  let s = String(raw).trim()
  if (!s) return ""

  const override = DISPLAY_OVERRIDES[s.toLowerCase()]
  if (override) return override

  // table.column → keep the column only
  if (s.includes(".")) s = s.split(".").pop() as string

  // strip known internal prefixes (repeatedly)
  let changed = true
  while (changed) {
    changed = false
    for (const p of STRIP_PREFIXES) {
      if (s.toLowerCase().startsWith(p) && s.length > p.length) {
        s = s.slice(p.length)
        changed = true
      }
    }
  }

  // strip a trailing table-id suffix ("partner_id" handled by override; generic
  // "_id" drops to the entity name)
  s = s.replace(/_id$/i, "")

  // split snake_case / camelCase / kebab into words, collapse repeats
  const words = collapseRepeats(
    s
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  )

  if (!words.length) return s
  // Sentence case: first word capitalized (or acronym), rest lower unless acronym.
  return words
    .map((w, i) => {
      const lower = w.toLowerCase()
      if (ACRONYMS.has(lower)) return w.toUpperCase()
      return i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : lower
    })
    .join(" ")
}

/** Register display overrides (used by U9's pack display map). */
export function registerLabels(map: Record<string, string>): void {
  for (const [k, v] of Object.entries(map)) DISPLAY_OVERRIDES[k.toLowerCase()] = v
}

export default labelize
