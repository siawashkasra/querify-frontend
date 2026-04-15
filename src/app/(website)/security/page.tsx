import type { Metadata } from "next"
import SecurityContent from "@/components/website/security/SecurityContent"
import { createMetadata, PAGE_SEO } from "@/lib/seo"

export const metadata: Metadata = createMetadata({ ...PAGE_SEO.security, path: "/security" })

export default function SecurityPage() {
  return <SecurityContent />
}
