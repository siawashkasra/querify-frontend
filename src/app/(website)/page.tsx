import { BarChart3, Zap } from "lucide-react"
import SectionHeading from "@/components/website/shared/SectionHeading"
import TrustBadge from "@/components/website/shared/TrustBadge"
import CTAButton from "@/components/website/shared/CTAButton"
import FeatureCard from "@/components/website/shared/FeatureCard"

export default function WebsiteHomePage() {
  return (
    <div className="py-16 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <div className="flex flex-wrap justify-center gap-2">
          <TrustBadge label="Read-only connections" />
          <TrustBadge label="Encrypted in transit" />
        </div>
        <h1 className="mt-6 text-hero-lg font-bold tracking-tight text-slate-900 sm:text-hero-xl">AI analytics for SaaS founders</h1>
        <p className="mt-4 text-lg text-slate-600">Ask your database anything in plain English. Ship insights without writing SQL.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <CTAButton href="/settings/connections/new">Connect your database free</CTAButton>
        </div>
      </div>
      <div className="mx-auto mt-20 max-w-5xl">
        <SectionHeading align="center" eyebrow="Foundation" title="Built for clarity" description="Shared layout and components are ready for the full marketing site." />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <FeatureCard icon={BarChart3} title="Natural language" description="Pose questions the way you think about your business, not your schema." />
          <FeatureCard icon={Zap} title="Fast answers" description="Go from question to chart or table without leaving the flow." />
        </div>
      </div>
    </div>
  )
}
