"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Lightbulb, TrendingDown, Users, Zap, Clock, GitBranch, BarChart3, Layers,
  AlertTriangle, Link2, Trophy, PauseCircle, ArrowUpRight, ThumbsUp, ThumbsDown, X, ChevronDown, HelpCircle,
} from "lucide-react"
import { cn } from "@/lib/cn"
import QueryChart from "@/components/chat/QueryChart"
import { insights as insightsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import type { ChartConfig, Insight } from "@/types"

const PATTERN_META: Record<string, { icon: typeof Lightbulb; label: string; tint: string }> = {
  segment_concentration: { icon: Users, label: "Hidden segment", tint: "text-violet-600 bg-violet-50 border-violet-200" },
  cohort_divergence: { icon: GitBranch, label: "Cohort gap", tint: "text-blue-600 bg-blue-50 border-blue-200" },
  leading_indicator: { icon: Zap, label: "Leading indicator", tint: "text-amber-600 bg-amber-50 border-amber-200" },
  trajectory_risk: { icon: TrendingDown, label: "Risk", tint: "text-red-600 bg-red-50 border-red-200" },
  temporal_pattern: { icon: Clock, label: "Pattern", tint: "text-teal-600 bg-teal-50 border-teal-200" },
  correlation_discovery: { icon: Link2, label: "Relationship", tint: "text-indigo-600 bg-indigo-50 border-indigo-200" },
  distribution_insight: { icon: BarChart3, label: "Distribution", tint: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  composition_shift: { icon: Layers, label: "Mix shift", tint: "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200" },
  benchmark_deviation: { icon: AlertTriangle, label: "Outlier", tint: "text-orange-600 bg-orange-50 border-orange-200" },
  co_occurrence: { icon: Link2, label: "Co-occurrence", tint: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  milestone_and_record: { icon: Trophy, label: "Milestone", tint: "text-green-600 bg-green-50 border-green-200" },
  stagnation: { icon: PauseCircle, label: "Stagnation", tint: "text-slate-600 bg-slate-50 border-slate-200" },
}

const FALLBACK = { icon: Lightbulb, label: "Insight", tint: "text-brand bg-brand/5 border-brand/20" }

function snap(insight: Insight): Record<string, unknown> {
  return (insight.data_snapshot ?? {}) as Record<string, unknown>
}

export default function PremiumInsightCard({ insight, onChanged }: { insight: Insight; onChanged?: () => void }) {
  const router = useRouter()
  const { activeConnectionId } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<1 | -1 | null>(insight.feedback_score ?? null)
  const [dismissed, setDismissed] = useState(false)

  const ds = snap(insight)
  const pattern = String(ds.pattern ?? insight.type)
  const meta = PATTERN_META[pattern] ?? FALLBACK
  const Icon = meta.icon
  const evidence = (ds.evidence ?? {}) as Record<string, unknown>
  const soWhat = ds.so_what as string | undefined
  const action = ds.suggested_action as string | undefined
  const explore = (ds.explore_question as string) || insight.headline
  const why = ds.why as string | undefined
  const chart = insight.chart_config as ChartConfig | null
  const chartRows = (chart?.data as Record<string, unknown>[] | undefined) ?? []

  if (dismissed) return null

  const sendFeedback = (score: 1 | -1) => {
    setFeedback(score)
    insightsApi.patternFeedback(insight.id, score).then(() => onChanged?.()).catch(() => {})
  }
  const dismiss = () => {
    setDismissed(true)
    insightsApi.dismiss(insight.id).then(() => onChanged?.()).catch(() => {})
  }
  const openExplore = () => {
    const conn = insight.connection_id || activeConnectionId
    router.push(`/chat/new?connection=${conn}&prompt=${encodeURIComponent(explore)}`)
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium", meta.tint)}>
          <Icon size={12} /> {String(ds.badge ?? meta.label)}
        </span>
        <div className="flex items-center gap-1.5">
          <ConfidencePip level={insight.confidence} />
          <button onClick={dismiss} title="Dismiss" className="text-[var(--text-muted)] hover:text-danger transition-colors"><X size={14} /></button>
        </div>
      </div>

      <h3 className="text-base font-semibold leading-snug text-[var(--text)]">{insight.headline}</h3>
      <p className="text-sm leading-[1.6] text-[var(--text-dim)]">{insight.summary}</p>

      {chart && chartRows.length >= 1 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
          <QueryChart config={chart} rows={chartRows} />
        </div>
      )}

      {(soWhat || action) && (
        <div className="rounded-lg border-l-[3px] border-brand bg-brand/[0.05] px-3.5 py-2.5 text-sm">
          {soWhat && <p className="text-[var(--text-dim)]">{soWhat}</p>}
          {action && <p className="mt-1 font-medium text-[var(--text)]">→ {action}</p>}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button onClick={openExplore}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-dim)] hover:border-brand hover:text-brand transition-colors">
          Explore <ArrowUpRight size={12} />
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => sendFeedback(1)} title="Brilliant"
            className={cn("rounded-md p-1.5 transition-colors", feedback === 1 ? "text-success bg-success/10" : "text-[var(--text-muted)] hover:text-success")}>
            <ThumbsUp size={14} />
          </button>
          <button onClick={() => sendFeedback(-1)} title="Not useful"
            className={cn("rounded-md p-1.5 transition-colors", feedback === -1 ? "text-danger bg-danger/10" : "text-[var(--text-muted)] hover:text-danger")}>
            <ThumbsDown size={14} />
          </button>
          <button onClick={() => setExpanded((e) => !e)} className="ml-1 inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-brand transition-colors">
            <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} /> Details
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
          {Object.keys(evidence).length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">The numbers</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(evidence).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-[var(--border)]/60 py-0.5">
                    <span className="text-[var(--text-muted)]">{k.replace(/_/g, " ")}</span>
                    <span className="font-mono text-[var(--text-dim)]">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {why && (
            <p className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
              <HelpCircle size={12} className="mt-0.5 shrink-0" /> {why}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ConfidencePip({ level }: { level?: string | null }) {
  const n = level === "high" ? 3 : level === "medium" ? 2 : 1
  return (
    <span className="inline-flex items-center gap-0.5" title={`${level ?? "low"} confidence`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i <= n ? "bg-brand" : "bg-[var(--surface-3)]")} />
      ))}
    </span>
  )
}
