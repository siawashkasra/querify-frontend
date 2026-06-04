"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronUp, ArrowRight, AlertTriangle } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { insights as insightsApi, connections } from "@/lib/api"
import { INSIGHTS_ENABLED } from "@/lib/featureFlags"
import { InsightCard } from "@/components/insights/InsightCard"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/cn"
import type { Insight } from "@/types"

interface InsightsRevealProps {
  connectionId: string
  databaseName: string
  revealStartMs: number
}

export const InsightsReveal = ({ connectionId, databaseName, revealStartMs }: InsightsRevealProps) => {
  const router = useRouter()
  const [headingVisible, setHeadingVisible] = useState(false)
  const [visibleCards, setVisibleCards] = useState(0)
  const [ctaVisible, setCtaVisible] = useState(false)
  const [knowsExpanded, setKnowsExpanded] = useState(false)
  const trackedReveal = useRef(false)

  const { data: insightsList = [] } = useQuery<Insight[]>({
    queryKey: ["insights", connectionId],
    queryFn: () => insightsApi.list(connectionId) as Promise<Insight[]>,
    staleTime: 30_000,
  })

  const { data: schemaSnap } = useQuery({
    queryKey: ["schema", connectionId],
    queryFn: () => connections.getSchema(connectionId),
    staleTime: 60_000,
  })

  const { data: context } = useQuery<Record<string, unknown>>({
    queryKey: ["context", connectionId],
    queryFn: () => connections.getContext(connectionId) as Promise<Record<string, unknown>>,
    staleTime: 60_000,
  })

  const tableCount = (schemaSnap as { table_count?: number } | undefined)?.table_count ?? 0
  const displayInsights = insightsList.slice(0, 3)

  useEffect(() => {
    if (trackedReveal.current) return
    trackedReveal.current = true
    track("onboarding_insights_revealed", {
      insights_count: insightsList.length,
      total_ms: Date.now() - revealStartMs,
    })
  }, [insightsList.length, revealStartMs])

  useEffect(() => {
    const t1 = setTimeout(() => setHeadingVisible(true), 300)
    const t2 = setTimeout(() => setVisibleCards(1), 700)
    const t3 = setTimeout(() => setVisibleCards(2), 1100)
    const t4 = setTimeout(() => setVisibleCards(3), 1500)
    const t5 = setTimeout(() => setCtaVisible(true), 2000)
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout)
  }, [])

  const knowsBullets = buildKnowsBullets(context, tableCount)

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg)] overflow-y-auto">
      <div className="flex flex-col items-center gap-8 min-h-full px-6 py-12">
        <span className="text-xl font-bold tracking-tight text-[var(--brand)]">QUERIFY</span>

        <div className={cn(
          "flex flex-col items-center gap-2 text-center transition-all duration-500",
          headingVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
        )}>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Here is what I found in your database</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Based on {tableCount > 0 ? `${tableCount} tables in ` : ""}{databaseName}
          </p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-[480px]">
          {displayInsights.map((insight, i) => (
            <div key={insight.id} className={cn(
              "transition-all duration-500",
              i < visibleCards ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            )}>
              <InsightCard insight={insight} onOpenModal={() => router.push(INSIGHTS_ENABLED ? "/insights" : "/dashboard")} />
            </div>
          ))}
          {displayInsights.length === 0 && ctaVisible && (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              Insights are still being generated — check back shortly.
            </p>
          )}
        </div>

        {ctaVisible && knowsBullets.length > 0 && (
          <div className="w-full max-w-[480px] border border-[var(--border)] rounded-lg overflow-hidden">
            <button
              onClick={() => setKnowsExpanded((v) => !v)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-[var(--text-dim)] hover:text-[var(--text)] transition-colors"
            >
              <span>What I understood about your data</span>
              {knowsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {knowsExpanded && (
              <div className="flex flex-col gap-2.5 px-4 pb-4 border-t border-[var(--border)] pt-3 animate-fade-slide-in">
                {knowsBullets.map((bullet, i) => (
                  <p key={i} className="text-xs text-[var(--text-dim)] flex items-start gap-2.5 leading-relaxed">
                    <span className="text-[var(--brand)] shrink-0 mt-px">✓</span>
                    {bullet}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={cn(
          "transition-all duration-500 mt-2",
          ctaVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <button
            onClick={() => {
              track("onboarding_first_question_clicked", { connection_id: connectionId })
              router.push("/chat/new")
            }}
            className="flex items-center gap-2 px-7 py-3.5 bg-[var(--brand)] text-white font-semibold rounded-lg hover:bg-[var(--brand-dark)] active:scale-95 transition-all text-sm shadow-lg shadow-[var(--brand)]/25"
          >
            Ask your first question
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

interface FallbackStateProps {
  connectionId: string
  reason: string
}

export const FallbackState = ({ connectionId, reason }: FallbackStateProps) => {
  const router = useRouter()

  useEffect(() => {
    track("onboarding_fallback_shown", { reason })
  }, [reason])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] px-6">
      <div className="flex flex-col items-center gap-8 w-full max-w-[480px] text-center">
        <span className="text-2xl font-bold tracking-tight text-[var(--brand)]">QUERIFY</span>
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-[var(--warning)]/15 flex items-center justify-center">
            <AlertTriangle size={22} className="text-[var(--warning)]" />
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-base font-medium text-[var(--text)]">
              We had trouble analysing your database automatically.
            </p>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              You can still ask questions — we will learn as you go.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            track("onboarding_first_question_clicked", { connection_id: connectionId, via: "fallback" })
            router.push("/chat/new")
          }}
          className="flex items-center gap-2 px-7 py-3.5 bg-[var(--brand)] text-white font-semibold rounded-lg hover:bg-[var(--brand-dark)] active:scale-95 transition-all text-sm"
        >
          Start asking questions
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

function buildKnowsBullets(context: Record<string, unknown> | undefined, tableCount: number): string[] {
  if (!context) return []
  const bullets: string[] = []
  const metrics = (context.metrics as unknown[]) ?? []
  const entities = (context.entities as Record<string, string>) ?? {}
  const dateFields = (context.date_fields as unknown[]) ?? []
  const businessType = (context.business_type as string | undefined) ?? ""

  if (metrics.length > 0) bullets.push(`Found ${metrics.length} revenue-related metric${metrics.length !== 1 ? "s" : ""}`)

  const customerEntry = Object.entries(entities).find(([, desc]) =>
    desc?.toLowerCase().includes("customer") || desc?.toLowerCase().includes("user")
  )
  if (customerEntry) bullets.push(`Identified "${customerEntry[0]}" as your primary customer table`)

  if (businessType && businessType !== "other") bullets.push(`Detected ${businessType.replace(/_/g, " ")} business model`)

  if (dateFields.length > 0) bullets.push(`Found ${dateFields.length} date column${dateFields.length !== 1 ? "s" : ""} for time-series analysis`)

  return bullets.slice(0, 4)
}

export default InsightsReveal
