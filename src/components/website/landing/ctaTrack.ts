import { track } from "@/lib/analytics"

export function trackCta(location: string, ctaText: string) {
  track("cta_clicked", { location, cta_text: ctaText })
}
