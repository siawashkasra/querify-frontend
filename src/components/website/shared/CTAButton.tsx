"use client"

import Link from "next/link"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"

const ctaClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-web-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-web-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export type CTAButtonProps = {
  href?: string
  loading?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">

export default function CTAButton({ href, loading, disabled, className, children, ...btnProps }: CTAButtonProps) {
  if (href) {
    return (
      <Link href={href} className={cn(ctaClass, loading && "pointer-events-none opacity-50", className)} aria-busy={loading}>
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
        {children}
      </Link>
    )
  }
  return (
    <button type="button" disabled={disabled || loading} className={cn(ctaClass, className)} {...btnProps}>
      {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}
