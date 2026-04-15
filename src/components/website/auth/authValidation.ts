export function isValidEmail(v: string) {
  const s = v.trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isValidPassword(v: string) {
  return v.length >= 8
}

export function nonEmpty(v: string) {
  return v.trim().length > 0
}
