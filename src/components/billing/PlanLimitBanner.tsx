"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Zap, X } from "lucide-react"
import { billing as billingApi } from "@/lib/api"
import type { UsageSummary, SubscriptionInfo } from "@/lib/api"
import { cn } from "@/lib/cn"

const DISMISS_KEY = "querify:limit-banner-dismissed"

const NEXT_PLAN: Record<string, { label: string; price: number }> = {
  free: { label: "Starter", price: 29 },
  starter: { label: "Pro", price: 79 },
  pro: { label: "Team", price: 199 },
}

export function PlanLimitBanner() {
  const [dismissed, setDismissed] = useState(true) // start hidden to avoid flash

  // Read sessionStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1")
  }, [])

  const { data: usage } = useQuery<UsageSummary>({
    queryKey: ["billing-usage"],
    queryFn: () => billingApi.usage() as Promise<UsageSummary>,
    refetchInterval: 5 * 60_000,
    staleTime: 4 * 60_000,
  })

  const { data: sub } = useQuery<SubscriptionInfo>({
    queryKey: ["billing-subscription"],
    queryFn: () => billingApi.subscription() as Promise<SubscriptionInfo>,
    staleTime: 5 * 60_000,
  })

  if (dismissed) return null
  if (!usage || usage.query_limit === null) return null

  const pct = Math.round((usage.queries_used / usage.query_limit) * 100)
  if (pct < 80) return null

  const planName = sub?.plan_name ?? "free"
  const next = NEXT_PLAN[planName]
  const remaining = usage.query_limit - usage.queries_used

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setDismissed(true)
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 border-b shrink-0",
      pct >= 95
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50"
    )}>
      <Zap size={13} className={cn("shrink-0", pct >= 95 ? "text-red-500" : "text-amber-500")} />
      <p className={cn("flex-1 text-xs min-w-0", pct >= 95 ? "text-red-800" : "text-amber-800")}>
        <span className="font-semibold">
          You have used {usage.queries_used.toLocaleString()} of {usage.query_limit.toLocaleString()} queries this month ({pct}%).
        </span>
        {" "}
        {remaining > 0
          ? `${remaining.toLocaleString()} ${remaining === 1 ? "query" : "queries"} remaining.`
          : "You have reached your monthly limit."}
        {next && " Upgrade for more capacity."}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        {next && (
          <Link
            href="/org/billing"
            className={cn(
              "text-xs font-medium px-3 py-1 rounded-lg text-white transition-colors whitespace-nowrap",
              pct >= 95 ? "bg-red-500 hover:bg-red-600" : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            Upgrade to {next.label}
          </Link>
        )}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={cn(
            "p-1 rounded transition-colors",
            pct >= 95 ? "text-red-400 hover:bg-red-100" : "text-amber-400 hover:bg-amber-100"
          )}
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default PlanLimitBanner
