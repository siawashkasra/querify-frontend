"use client"

import Link from "next/link"
import { cn } from "@/lib/cn"
import { trackCta } from "./ctaTrack"

export function TrackedTextLink({ href, location, ctaText, children, className }: { href: string; location: string; ctaText: string; children: React.ReactNode; className?: string }) {
  return <Link href={href} onClick={() => trackCta(location, ctaText)} className={cn("font-semibold text-web-brand underline-offset-4 transition-colors hover:text-web-brand-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm", className)}>{children}</Link>
}
