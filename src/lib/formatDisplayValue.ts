const LOCALE_LIKE_KEY = /^[a-z]{2}([_-][A-Za-z0-9]+)?$/i

function isTranslationLikeMap(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o)
  if (keys.length === 0) return false
  let hasNonEmptyString = false
  for (const k of keys) {
    if (!LOCALE_LIKE_KEY.test(k)) return false
    const v = o[k]
    if (v == null) continue
    if (typeof v !== "string") return false
    if (v.trim() !== "") hasNonEmptyString = true
  }
  return hasNonEmptyString
}

function browserLocaleUnderscore(): string {
  if (typeof navigator === "undefined" || !navigator.language) return "en_US"
  return navigator.language.replace("-", "_")
}

function pickTranslationString(o: Record<string, unknown>): string {
  const norm = (s: string) => s.toLowerCase().replace(/-/g, "_")
  const byNorm = new Map<string, string>()
  for (const [k, v] of Object.entries(o)) {
    if (typeof v === "string" && v.trim() !== "") byNorm.set(norm(k), v)
  }
  const lang = browserLocaleUnderscore()
  const short = lang.split("_")[0] ?? "en"
  const tryKeys = [norm(lang), short, "en_us", "en_gb", "en"]
  for (const tk of tryKeys) {
    const hit = byNorm.get(tk)
    if (hit) return hit
  }
  const sorted = [...byNorm.entries()].sort(([a], [b]) => a.localeCompare(b))
  return sorted[0]?.[1] ?? ""
}

export function formatUnknownForUi(value: unknown): string {
  if (value == null) return ""
  const t = typeof value
  if (t === "string" || t === "number" || t === "boolean" || t === "bigint") return String(value)
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    if (value.length === 1 && value[0] != null && typeof value[0] === "object" && !Array.isArray(value[0])) {
      const inner = formatUnknownForUi(value[0])
      if (inner) return inner
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  if (t === "object" && value !== null && !Array.isArray(value)) {
    const o = value as Record<string, unknown>
    if (isTranslationLikeMap(o)) {
      const s = pickTranslationString(o)
      if (s) return s
    }
    try {
      return JSON.stringify(value)
    } catch {
      return String(value)
    }
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
