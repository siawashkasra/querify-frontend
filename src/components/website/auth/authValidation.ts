export function isValidEmail(v: string) {
  const s = v.trim()
  if (!s) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export function isValidPassword(v: string) {
  return v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v)
}

export function passwordRequirementsMessage(v: string): string {
  if (v.length < 8) return "Use at least 8 characters"
  if (!/[A-Z]/.test(v)) return "Add at least one uppercase letter"
  if (!/[0-9]/.test(v)) return "Add at least one number"
  return ""
}

export function nonEmpty(v: string) {
  return v.trim().length > 0
}
