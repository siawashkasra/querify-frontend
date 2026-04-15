import type { Metadata } from "next"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Changelog — Querify",
  description: "What is new in Querify: releases, improvements, and fixes.",
  path: "/changelog",
})

export default function ChangelogPage() {
  return <h1 className="py-16 text-2xl font-semibold text-slate-900">Changelog</h1>
}
