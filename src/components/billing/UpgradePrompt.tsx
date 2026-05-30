"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, X, Zap, TrendingUp } from "lucide-react"
import { cn } from "@/lib/cn"

// ── Inline variant — appears inside a feature area ────────────────────────────

interface InlineProps {
  feature: string
  plan?: string
  price?: number
  className?: string
}

export function UpgradePromptInline({ feature, plan = "Starter", price = 29, className }: InlineProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3",
      className
    )}>
      <Lock size={15} className="text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-medium">{feature}</span> {" "}
        {`${feature.endsWith("s") ? "are" : "is"} available on ${plan} and above.`}
      </p>
      <Link
        href="/settings/billing"
        className="flex-shrink-0 rounded-lg bg-amber-500 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-600 transition-colors whitespace-nowrap"
      >
        Upgrade for ${price}/mo
      </Link>
    </div>
  )
}

// ── Banner variant — top of page at 80%+ usage ────────────────────────────────

interface BannerProps {
  usagePct: number
  queriesUsed: number
  queryLimit: number
  nextPlan?: string
  periodEnd?: string | null
  onDismiss?: () => void
  className?: string
}

export function UpgradePromptBanner({
  usagePct, queriesUsed, queryLimit, nextPlan = "Starter", periodEnd, onDismiss, className,
}: BannerProps) {
  const remaining = queryLimit - queriesUsed
  const resetLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b border-amber-200 bg-amber-50",
      className
    )}>
      <Zap size={14} className="text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-800 min-w-0">
        <span className="font-semibold">{Math.round(usagePct)}% of monthly queries used.</span>
        {" "}
        {remaining} {remaining === 1 ? "query" : "queries"} remaining
        {resetLabel && `. Resets ${resetLabel}`}.
      </p>
      <Link
        href="/settings/billing"
        className="flex-shrink-0 rounded bg-amber-500 text-white text-xs font-medium px-3 py-1 hover:bg-amber-600 transition-colors whitespace-nowrap"
      >
        Upgrade to {nextPlan}
      </Link>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1 rounded text-amber-500 hover:text-amber-700 hover:bg-amber-100 transition-colors"
          aria-label="Dismiss"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

// ── Locked card overlay — for blurred feature previews ────────────────────────

interface LockedOverlayProps {
  feature: string
  plan?: string
  price?: number
  className?: string
}

export function LockedFeatureOverlay({ feature, plan = "Starter", price = 29, className }: LockedOverlayProps) {
  return (
    <div className={cn(
      "absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl",
      "bg-white/80 backdrop-blur-sm border border-[var(--border)] z-10",
      className
    )}>
      <div className="w-10 h-10 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
        <TrendingUp size={18} className="text-amber-500" />
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-[var(--text)] mb-0.5">{feature}</p>
        <p className="text-xs text-[var(--text-muted)]">Available on {plan} and above</p>
      </div>
      <Link
        href="/settings/billing"
        className="rounded-lg bg-[var(--brand)] text-white text-xs font-medium px-4 py-1.5 hover:bg-[var(--brand-hover)] transition-colors"
      >
        Upgrade for ${price}/mo
      </Link>
    </div>
  )
}

// ── 80% usage session banner — shown in chat after limit warning ──────────────

export function UsageWarningBanner({
  pct, queriesUsed, queryLimit, periodEnd, onDismiss,
}: {
  pct: number
  queriesUsed: number
  queryLimit: number
  periodEnd?: string | null
  onDismiss: () => void
}) {
  return (
    <UpgradePromptBanner
      usagePct={pct}
      queriesUsed={queriesUsed}
      queryLimit={queryLimit}
      periodEnd={periodEnd}
      onDismiss={onDismiss}
    />
  )
}
