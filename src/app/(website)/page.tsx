import type { Metadata } from "next"
import HeroSection from "@/components/website/landing/HeroSection"
import ProblemSection from "@/components/website/landing/ProblemSection"
import HowItWorksSection from "@/components/website/landing/HowItWorksSection"
import ExampleQuestionsSection from "@/components/website/landing/ExampleQuestionsSection"
import SecuritySection from "@/components/website/landing/SecuritySection"
import PricingPreviewSection from "@/components/website/landing/PricingPreviewSection"
import FinalCtaSection from "@/components/website/landing/FinalCtaSection"
import HomeJsonLd from "@/components/seo/HomeJsonLd"
import { createMetadata, DEFAULT_DESCRIPTION, DEFAULT_TITLE } from "@/lib/seo"

export const metadata: Metadata = createMetadata({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" })

export default function WebsiteHomePage() {
  return (
    <div className="overflow-x-hidden">
      <HomeJsonLd />
      <HeroSection />
      <ProblemSection />
      <HowItWorksSection />
      <ExampleQuestionsSection />
      <SecuritySection />
      <PricingPreviewSection />
      <FinalCtaSection />
    </div>
  )
}
