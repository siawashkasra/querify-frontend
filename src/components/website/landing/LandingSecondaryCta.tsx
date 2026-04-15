"use client"

import Link from "next/link"
import { cn } from "@/lib/cn"
import { trackCta } from "./ctaTrack"

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2"

export function LandingSecondaryCta({ href, children, location, ctaText, className }: { href: string; children: React.ReactNode; location: string; ctaText: string; className?: string }) {
  return <Link href={href} onClick={() => trackCta(location, ctaText)} className={cn(btn, className)}>{children}</Link>
}
