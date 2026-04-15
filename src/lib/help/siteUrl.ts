export function getSiteUrl() {
  const u = process.env.NEXT_PUBLIC_SITE_URL
  if (u && u.startsWith("http")) return u.replace(/\/$/, "")
  return "https://querify.app"
}
