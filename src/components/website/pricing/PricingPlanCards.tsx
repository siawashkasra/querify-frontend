"use client"

import Link from "next/link"
import { Check } from "lucide-react"
import { cn } from "@/lib/cn"
import { trackPlanCta, type BillingPeriod, type PricingPlanId } from "./planCtaTrack"

type PlanDef = {
  id: PricingPlanId
  name: string
  description: string
  monthlyPriceLabel: string
  annualPriceLabel: string
  annualPriceSub?: string
  features: string[]
  cta: string
  href: string
  highlight?: boolean
  badge?: string
  paidTrial?: boolean
}

const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    description: "Try Querify on your own data.",
    monthlyPriceLabel: "$0",
    annualPriceLabel: "$0",
    features: ["20 queries / month", "1 database connection", "7-day query history"],
    cta: "Start free — no credit card required",
    href: "/signup",
  },
  {
    id: "starter",
    name: "Starter",
    description: "For founders who live in the numbers.",
    monthlyPriceLabel: "$29",
    annualPriceLabel: "$290",
    annualPriceSub: "/year",
    features: ["300 queries / month", "2 connections", "90-day history", "Insights", "Exports", "3 seats"],
    cta: "Start Starter",
    href: "/signup?plan=starter",
    highlight: true,
    badge: "Most popular",
    paidTrial: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams that need speed and room.",
    monthlyPriceLabel: "$79",
    annualPriceLabel: "$790",
    annualPriceSub: "/year",
    features: ["Unlimited queries", "Unlimited connections", "1-year history", "10 seats", "Priority support"],
    cta: "Start Pro",
    href: "/signup?plan=pro",
    paidTrial: true,
  },
  {
    id: "team",
    name: "Team",
    description: "For orgs that need more control and help.",
    monthlyPriceLabel: "$199",
    annualPriceLabel: "$1,990",
    annualPriceSub: "/year",
    features: ["Everything in Pro", "Unlimited seats", "Dedicated support"],
    cta: "Contact us",
    href: "mailto:sales@querify.app?subject=Querify%20Team%20plan",
    paidTrial: false,
  },
]

export default function PricingPlanCards({ billing }: { billing: BillingPeriod }) {
  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {PLANS.map((p) => (
        <div
          key={p.id}
          className={cn(
            "relative flex flex-col rounded-2xl border p-6 transition-shadow duration-300 sm:p-8",
            p.highlight ? "border-web-brand bg-web-brand-light/25 shadow-lg ring-2 ring-web-brand/25 lg:scale-[1.02]" : "border-slate-200 bg-white shadow-sm"
          )}
        >
          {p.badge && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-web-brand px-3 py-1 text-xs font-bold text-white shadow-md">{p.badge}</span>
          )}
          <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
          <p className="mt-2 min-h-[40px] text-sm text-slate-600">{p.description}</p>
          <div className="mt-6 min-h-[4.5rem]">
            <p className="flex flex-wrap items-baseline gap-1">
              <span key={billing} className="animate-fade-slide-in text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
                {billing === "monthly" ? p.monthlyPriceLabel : p.annualPriceLabel}
              </span>
              {p.id !== "free" && (
                <span className="text-sm font-medium text-slate-500"> {billing === "monthly" ? "/month" : p.annualPriceSub ?? "/year"}</span>
              )}
            </p>
            {p.id !== "free" && billing === "monthly" && <p className="mt-1 text-xs text-slate-500">Billed monthly</p>}
            {p.id !== "free" && billing === "annual" && <p className="mt-1 text-xs text-slate-500">Billed annually · 2 months free</p>}
          </div>
          <ul className="mt-6 flex flex-1 flex-col gap-1.5 text-sm text-slate-700">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-web-brand" aria-hidden />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          {p.paidTrial && <p className="mt-4 text-xs text-slate-500">14-day free trial · then billed {billing === "monthly" ? "monthly" : "annually"}</p>}
          <PlanCtaButton plan={p} billing={billing} />
        </div>
      ))}
    </div>
  )
}

function PlanCtaButton({ plan, billing }: { plan: PlanDef; billing: BillingPeriod }) {
  const isExternal = plan.href.startsWith("mailto:")
  const onClick = () => trackPlanCta(plan.id, billing)
  const className = cn(
    "mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-3 text-center text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2",
    plan.highlight ? "bg-web-brand text-white hover:bg-web-brand-dark" : "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
  )
  if (isExternal) {
    return (
      <a href={plan.href} onClick={onClick} className={className}>
        {plan.cta}
      </a>
    )
  }
  return (
    <Link href={plan.href} onClick={onClick} className={className}>
      {plan.cta}
    </Link>
  )
}
