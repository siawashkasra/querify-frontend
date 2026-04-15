"use client"

import { Check } from "lucide-react"
import SectionShell from "./SectionShell"
import { LandingPrimaryCta } from "./LandingPrimaryCta"
import { TrackedTextLink } from "./TrackedTextLink"
import { cn } from "@/lib/cn"

const PLANS = [
  { name: "Free", price: "$0", features: ["1 database connection", "50 questions per month", "Read-only access"], cta: "Start free", highlight: false },
  { name: "Starter", price: "$29/mo", features: ["Up to 3 connections", "Unlimited questions", "Email support"], cta: "Choose Starter", highlight: true },
  { name: "Pro", price: "$79/mo", features: ["Up to 10 connections", "Team workspaces", "Priority support"], cta: "Choose Pro", highlight: false },
] as const

export default function PricingPreviewSection() {
  return (
    <SectionShell className="bg-slate-50/80">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Simple, honest pricing</h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.name} className={cn("flex flex-col rounded-2xl border p-8", p.highlight ? "border-web-brand bg-web-brand-light/30 shadow-lg ring-1 ring-web-brand/20" : "border-slate-200 bg-white shadow-sm")}>
              <h3 className="text-lg font-semibold text-slate-900">{p.name}</h3>
              <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">{p.price}</p>
              <ul className="mt-6 flex flex-col gap-3 text-sm text-slate-700">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="h-5 w-5 shrink-0 text-web-brand" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <LandingPrimaryCta href="/signup" location="pricing_preview" ctaText={p.cta} className="mt-8 w-full justify-center">{p.cta}</LandingPrimaryCta>
            </div>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-slate-600">
          <TrackedTextLink href="/pricing" location="pricing_preview" ctaText="See full pricing">See full pricing</TrackedTextLink>
        </p>
      </div>
    </SectionShell>
  )
}
