"use client"

import { cn } from "@/lib/cn"
import type { BillingPeriod } from "./planCtaTrack"

export default function PricingBillingToggle({ value, onChange }: { value: BillingPeriod; onChange: (v: BillingPeriod) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-1 shadow-inner">
        <button type="button" onClick={() => onChange("monthly")} className={cn("rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2", value === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          Monthly
        </button>
        <button type="button" onClick={() => onChange("annual")} className={cn("rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2", value === "annual" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900")}>
          Annual
        </button>
      </div>
      {value === "annual" && <span className="animate-fade-slide-in inline-flex items-center rounded-full border border-web-brand/30 bg-web-brand-light px-3 py-1 text-xs font-semibold text-web-brand">2 months free</span>}
    </div>
  )
}
