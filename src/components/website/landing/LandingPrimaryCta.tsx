"use client"

import Link from "next/link"
import { cn } from "@/lib/cn"
import { trackCta } from "./ctaTrack"

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-web-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2"

export function LandingPrimaryCta({ href, children, location, ctaText, className }: { href: string; children: React.ReactNode; location: string; ctaText: string; className?: string }) {
  return <Link href={href} onClick={() => trackCta(location, ctaText)} className={cn(btn, className)}>{children}</Link>
}
