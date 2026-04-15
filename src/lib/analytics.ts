import posthog from "posthog-js"

export const track = (event: string, properties?: Record<string, unknown>): void => {
  if (typeof window === "undefined") return
  if (!posthog.__loaded) return
  posthog.capture(event, properties)
}
