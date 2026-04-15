import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Contact — Querify",
  description: "Get in touch with Querify for product questions, sales, partnerships, or support.",
  path: "/contact",
})

export default function ContactPage() {
  return <h1 className="py-16 text-2xl font-semibold text-slate-900">Contact</h1>
}
