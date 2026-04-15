"use client"

import Image from "next/image"
import SectionShell from "./SectionShell"
import { LandingPrimaryCta } from "./LandingPrimaryCta"
import { LandingSecondaryCta } from "./LandingSecondaryCta"

export default function HeroSection() {
  return (
    <SectionShell>
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="text-hero-md font-bold tracking-tight text-slate-900 sm:text-hero-lg md:text-hero-xl">Ask your database anything. Get answers in seconds.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600 sm:text-xl">Connect your database and start asking business questions — no SQL, no dashboards, no setup. Querify understands your data automatically.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <LandingPrimaryCta href="/signup" location="hero" ctaText="Connect your database free">Connect your database free</LandingPrimaryCta>
          <LandingSecondaryCta href="#how-it-works" location="hero" ctaText="See how it works">See how it works</LandingSecondaryCta>
        </div>
        <p className="mt-6 text-sm text-slate-500">Read-only access · Your data stays yours · Works in 90 seconds</p>
      </div>
      <div className="relative mx-auto mt-12 aspect-[1200/720] w-full max-w-5xl">
        <Image src="/images/hero-mockup.png" alt="Querify chat interface with a business question and an answer with a chart" fill className="rounded-xl border border-slate-200 object-contain shadow-lg" sizes="(max-width: 768px) 100vw, 1200px" priority />
      </div>
    </SectionShell>
  )
}
