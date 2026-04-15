import HeroSection from "@/components/website/landing/HeroSection"
import ProblemSection from "@/components/website/landing/ProblemSection"
import HowItWorksSection from "@/components/website/landing/HowItWorksSection"
import ExampleQuestionsSection from "@/components/website/landing/ExampleQuestionsSection"
import SecuritySection from "@/components/website/landing/SecuritySection"
import PricingPreviewSection from "@/components/website/landing/PricingPreviewSection"
import FinalCtaSection from "@/components/website/landing/FinalCtaSection"

export default function WebsiteHomePage() {
  return (
    <div className="overflow-x-hidden">
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
