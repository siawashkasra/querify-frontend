import posthog from "posthog-js"

let initialized = false

export function initPosthog(): void {
  if (typeof window === "undefined" || initialized) return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com"
  posthog.init(key, { api_host: host, persistence: "localStorage", capture_pageview: true, capture_pageleave: true })
  initialized = true
}

export function isPosthogInitialized(): boolean {
  return initialized
}
