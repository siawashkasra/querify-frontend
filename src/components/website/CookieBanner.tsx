"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { initPosthog } from "@/lib/initPosthog"

export const COOKIE_CONSENT_KEY = "cookie_consent"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    try {
      const c = localStorage.getItem(COOKIE_CONSENT_KEY)
      if (c === "accepted") initPosthog()
      if (!c) setVisible(true)
    } catch {
      setVisible(true)
    }
  }, [])
  useEffect(() => {
    if (typeof document === "undefined") return
    if (visible) document.body.style.paddingBottom = "7.5rem"
    else document.body.style.paddingBottom = ""
    return () => {
      document.body.style.paddingBottom = ""
    }
  }, [visible])
  const accept = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    } catch {}
    initPosthog()
    setVisible(false)
  }
  const reject = () => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, "rejected")
    } catch {}
    setVisible(false)
  }
  if (!visible) return null
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.08)] md:p-5" role="dialog" aria-label="Cookie consent">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="text-base leading-relaxed text-slate-700 md:flex-1">
          We use cookies to improve your experience and analyse usage. No advertising cookies.{" "}
          <Link href="/cookies" className="font-medium text-web-brand underline-offset-4 transition-colors hover:text-web-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Learn more</Link>
        </p>
        <div className="flex flex-shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={reject} className="order-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand sm:order-1">Reject non-essential</button>
          <button type="button" onClick={accept} className="order-1 rounded-lg bg-web-brand px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 sm:order-2">Accept all</button>
        </div>
      </div>
    </div>
  )
}
