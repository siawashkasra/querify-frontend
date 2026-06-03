// Human number formatting — mirrors the backend app/services/analytics/formatting.py
// $1.2M, 12.4%, 1,247.

const CURRENCY_TOKENS = ["revenue", "amount", "price", "cost", "sales", "mrr", "arr",
  "total", "balance", "fee", "payment", "spend", "ltv", "gmv", "charge", "profit",
  "margin", "income", "salary"]
const PERCENT_TOKENS = ["rate", "percent", "pct", "ratio", "churn", "conversion", "share", "growth"]

export function isCurrencyField(name?: string | null): boolean {
  const n = (name ?? "").toLowerCase()
  return CURRENCY_TOKENS.some((t) => n.includes(t))
}

export function isPercentField(name?: string | null): boolean {
  const n = (name ?? "").toLowerCase()
  return PERCENT_TOKENS.some((t) => n.includes(t))
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "boolean") return null
  const n = Number(String(value).replace(/[$,%\s]/g, ""))
  return Number.isFinite(n) ? n : null
}

export function compact(value: unknown): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  const a = Math.abs(n)
  const sign = n < 0 ? "-" : ""
  if (a >= 1_000_000_000) return `${sign}${trim(a / 1_000_000_000)}B`
  if (a >= 1_000_000) return `${sign}${trim(a / 1_000_000)}M`
  if (a >= 1_000) return `${sign}${trim(a / 1_000)}K`
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

function trim(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "")
}

export function formatNumber(value: unknown, opts: { compact?: boolean } = {}): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  if (opts.compact) return compact(n)
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 })
}

export function formatCurrency(value: unknown, opts: { compact?: boolean } = { compact: true }): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  const sign = n < 0 ? "-" : ""
  const a = Math.abs(n)
  if (opts.compact && a >= 1000) return `${sign}$${compact(a)}`
  return `${sign}$${a.toLocaleString("en-US", { maximumFractionDigits: a === Math.round(a) ? 0 : 2 })}`
}

export function formatPercent(value: unknown): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n
  return pct === Math.round(pct) ? `${pct}%` : `${pct.toFixed(1)}%`
}

// Format a value, inferring currency/percent from the column name.
export function formatByField(value: unknown, field?: string | null, opts: { compact?: boolean } = {}): string {
  if (value == null) return "—"
  if (isCurrencyField(field)) return formatCurrency(value, { compact: opts.compact ?? true })
  if (isPercentField(field)) return formatPercent(value)
  const n = toNumber(value)
  if (n === null) return String(value)
  return formatNumber(value, { compact: opts.compact ?? false })
}

// Axis tick formatter — always compact so axes never crowd.
export function formatAxis(value: unknown, field?: string | null): string {
  if (isCurrencyField(field)) return formatCurrency(value, { compact: true })
  if (isPercentField(field)) return formatPercent(value)
  return formatNumber(value, { compact: true })
}
