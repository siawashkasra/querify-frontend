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

// Currency symbols come from the browser's built-in CLDR (Intl) — ANY ISO 4217
// code works, nothing hardcoded. A code without a distinct symbol renders as a
// labelled prefix ("AFN 1.2M") — never a misleading '$'.
const _symbolCache = new Map<string, string>()

export function currencySymbol(code?: string | null): string {
  if (!code) return "$"
  const c = code.trim().toUpperCase()
  const cached = _symbolCache.get(c)
  if (cached !== undefined) return cached
  let result = `${c} `
  try {
    const parts = new Intl.NumberFormat("en", {
      style: "currency", currency: c, currencyDisplay: "narrowSymbol",
    }).formatToParts(1)
    const sym = parts.find((p) => p.type === "currency")?.value
    if (sym && sym.toUpperCase() !== c) {
      result = /[A-Za-z]$/.test(sym) ? `${sym} ` : sym
    }
  } catch { /* unknown code → labelled prefix */ }
  _symbolCache.set(c, result)
  return result
}

export function formatCurrency(value: unknown, opts: { compact?: boolean; code?: string | null } = { compact: true }): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  const sym = currencySymbol(opts.code)
  const sign = n < 0 ? "-" : ""
  const a = Math.abs(n)
  if (opts.compact && a >= 1000) return `${sign}${sym}${compact(a)}`
  return `${sign}${sym}${a.toLocaleString("en-US", { maximumFractionDigits: a === Math.round(a) ? 0 : 2 })}`
}

export function formatPercent(value: unknown): string {
  const n = toNumber(value)
  if (n === null) return String(value ?? "")
  const pct = Math.abs(n) <= 1.5 ? n * 100 : n
  return pct === Math.round(pct) ? `${pct}%` : `${pct.toFixed(1)}%`
}

// Format a value, inferring currency/percent from the column name.
export function formatByField(value: unknown, field?: string | null, opts: { compact?: boolean; currency?: string | null } = {}): string {
  if (value == null) return "—"
  if (isCurrencyField(field)) return formatCurrency(value, { compact: opts.compact ?? true, code: opts.currency })
  if (isPercentField(field)) return formatPercent(value)
  const n = toNumber(value)
  if (n === null) return String(value)
  return formatNumber(value, { compact: opts.compact ?? false })
}

// Axis tick formatter — always compact so axes never crowd.
export function formatAxis(value: unknown, field?: string | null, currency?: string | null): string {
  if (isCurrencyField(field)) return formatCurrency(value, { compact: true, code: currency })
  if (isPercentField(field)) return formatPercent(value)
  return formatNumber(value, { compact: true })
}
