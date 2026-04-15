"use client"

import { useState } from "react"
import PricingBillingToggle from "./PricingBillingToggle"
import PricingPlanCards from "./PricingPlanCards"
import PricingComparisonTable from "./PricingComparisonTable"
import PricingFaq from "./PricingFaq"
import PricingEnterpriseSection from "./PricingEnterpriseSection"
import PricingSecurityBottom from "./PricingSecurityBottom"
import type { BillingPeriod } from "./planCtaTrack"

export default function PricingPageContent() {
  const [billing, setBilling] = useState<BillingPeriod>("monthly")
  return (
    <div className="pb-16 pt-8 md:pb-24 md:pt-12">
      <section className="mx-auto max-w-7xl py-12 md:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <h1 className="text-hero-sm font-bold tracking-tight text-slate-900 sm:text-hero-md md:text-hero-lg">Simple, honest pricing. Start free.</h1>
          <div className="mt-8">
            <PricingBillingToggle value={billing} onChange={setBilling} />
          </div>
        </header>
        <div className="mt-12">
          <PricingPlanCards billing={billing} />
        </div>
      </section>
      <section className="mx-auto max-w-5xl py-12 md:py-20" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Compare everything</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Same features you see in the cards, in one place.</p>
        <div className="mt-10">
          <PricingComparisonTable />
        </div>
      </section>
      <section className="mx-auto max-w-3xl py-12 md:py-20" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Questions</h2>
        <div className="mt-8">
          <PricingFaq />
        </div>
      </section>
      <div className="mx-auto max-w-3xl py-12 md:py-20">
        <PricingEnterpriseSection />
      </div>
      <div className="mx-auto max-w-3xl pb-4 md:pb-0">
        <PricingSecurityBottom />
      </div>
    </div>
  )
}
