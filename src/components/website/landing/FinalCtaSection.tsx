"use client"

import SectionShell from "./SectionShell"
import { LandingPrimaryCta } from "./LandingPrimaryCta"

export default function FinalCtaSection() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-2xl rounded-2xl border border-web-brand/20 bg-web-brand-light/40 px-6 py-12 text-center shadow-sm sm:px-10">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your database is full of answers. Start asking.</h2>
        <p className="mt-4 text-lg text-slate-600">Connect in 60 seconds. Your first insights are waiting.</p>
        <div className="mt-8 flex justify-center">
          <LandingPrimaryCta href="/signup" location="final_cta" ctaText="Connect your database free">Connect your database free</LandingPrimaryCta>
        </div>
        <p className="mt-6 text-sm text-slate-500">No credit card required · Cancel anytime · Read-only access</p>
      </div>
    </SectionShell>
  )
}
