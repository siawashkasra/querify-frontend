"use client"

import { LandingPrimaryCta } from "@/components/website/landing/LandingPrimaryCta"

export default function HowItWorksFooterCta() {
  return (
    <div className="flex justify-center">
      <LandingPrimaryCta href="/signup" location="how_it_works_bottom" ctaText="See for yourself — Connect your database free">See for yourself — Connect your database free</LandingPrimaryCta>
    </div>
  )
}
