import type { Metadata } from "next"
import HowItWorksContent from "@/components/website/how-it-works/HowItWorksContent"
import { createMetadata, PAGE_SEO } from "@/lib/seo"

export const metadata: Metadata = createMetadata({ ...PAGE_SEO.howItWorks, path: "/how-it-works" })

export default function HowItWorksPage() {
  return <HowItWorksContent />
}
