import type { Metadata } from "next"
import PricingPageContent from "@/components/website/pricing/PricingPageContent"
import PricingJsonLd from "@/components/seo/PricingJsonLd"
import { createMetadata, PAGE_SEO } from "@/lib/seo"

export const metadata: Metadata = createMetadata({ ...PAGE_SEO.pricing, path: "/pricing" })

export default function PricingPage() {
  return (
    <>
      <PricingJsonLd />
      <PricingPageContent />
    </>
  )
}
