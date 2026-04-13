type PhInstance = { capture: (event: string, properties?: Record<string, unknown>) => void }

export const track = (event: string, properties?: Record<string, unknown>): void => {
  if (typeof window === "undefined") return
  const ph = (window as unknown as Record<string, unknown>).posthog as PhInstance | undefined
  if (ph && typeof ph.capture === "function") ph.capture(event, properties)
}
