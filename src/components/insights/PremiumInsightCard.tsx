"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpRight, ThumbsUp, ThumbsDown, X, ChevronDown, HelpCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import QueryChart from "@/components/chat/QueryChart"
import { insights as insightsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import type { ChartConfig, Insight } from "@/types"

// Calm grey pattern pills — no loud colour. Strong colour is reserved for the chart.
const PATTERN_LABEL: Record<string, string> = {
  segment_concentration: "Concentration",
  cohort_divergence: "Cohort gap",
  leading_indicator: "Leading indicator",
  trajectory_risk: "Risk",
  temporal_pattern: "Pattern",
  correlation_discovery: "Relationship",
  distribution_insight: "Distribution",
  composition_shift: "Mix shift",
  benchmark_deviation: "Outlier",
  co_occurrence: "Co-occurrence",
  milestone_and_record: "Milestone",
  stagnation: "Stagnation",
}

// Headline numbers are mono+bold inline; the sentence itself stays sans-serif.
const NUMBER_RE = /(\$[\d,]+(?:\.\d+)?[KMBkmb]?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?[x×]|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g
function withMonoNumbers(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(NUMBER_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index!))
    parts.push(<span key={m.index} className="font-mono font-semibold">{m[0]}</span>)
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function snap(insight: Insight): Record<string, unknown> {
  return (insight.data_snapshot ?? {}) as Record<string, unknown>
}

const PRIORITY_DOT: Record<string, string> = { high: "bg-red-500", medium: "bg-amber-400", low: "bg-gray-300" }

export default function PremiumInsightCard({ insight, onChanged }: { insight: Insight; onChanged?: () => void }) {
  const router = useRouter()
  const { activeConnectionId } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [feedback, setFeedback] = useState<1 | -1 | null>(insight.feedback_score ?? null)
  const [dismissed, setDismissed] = useState(false)

  const ds = snap(insight)
  const pattern = String(ds.pattern ?? insight.type)
  const label = String(ds.badge ?? PATTERN_LABEL[pattern] ?? "Insight")
  const priority = (insight.is_urgent ? "high" : String(ds.priority ?? "medium")) as "high" | "medium" | "low"
  const evidence = (ds.evidence ?? {}) as Record<string, unknown>
  const soWhat = ds.so_what as string | undefined
  const action = ds.suggested_action as string | undefined
  const explore = (ds.explore_question as string) || insight.headline
  const why = ds.why as string | undefined
  const chart = insight.chart_config as ChartConfig | null
  const chartRows = (chart?.data as Record<string, unknown>[] | undefined) ?? []
  // Only show a chart that genuinely illustrates the insight — never a lone bar.
  const showChart = !!chart && chartRows.length >= 2

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
    <article className="flex flex-col gap-3 rounded-xl border border-[#E5E7EB] bg-white p-5">
      {/* top row: pattern pill · priority + time */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
          {label}
        </span>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", PRIORITY_DOT[priority])} />
            {priority === "high" ? "Priority" : ""}
          </span>
          <span>{formatDistanceToNow(new Date(insight.generated_at), { addSuffix: true })}</span>
        </div>
      </div>

      {/* headline — readable IBM Plex Sans sentence, near-black */}
      <h3 className="font-sans text-[18px] font-semibold leading-snug text-[#111827]">
        {withMonoNumbers(insight.headline)}
      </h3>

      {/* narrative */}
      {insight.summary && (
        <p className="font-sans text-sm leading-[1.6] text-[#4B5563]">{insight.summary}</p>
      )}

      {/* evidence chart — only when it proves something; muted, single accent */}
      {showChart && (
        <div className="rounded-lg border border-[#F1F2F4] bg-[#FBFBFC] p-3">
          <QueryChart config={chart!} rows={chartRows} />
        </div>
      )}

      {/* so what / suggested action — subtle strip */}
      {(soWhat || action) && (
        <div className="rounded-lg bg-[#F8F9FB] px-3.5 py-2.5 text-sm">
          {soWhat && <p className="text-[#4B5563]">{soWhat}</p>}
          {action && <p className={cn("font-medium text-[#111827]", soWhat && "mt-1")}>→ {action}</p>}
        </div>
      )}

      {/* footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <button onClick={openExplore} className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-[#111827] transition-colors">
          Explore <ArrowUpRight size={13} />
        </button>
        <div className="flex items-center gap-1.5 text-gray-400">
          <button onClick={() => sendFeedback(1)} title="Helpful"
            className={cn("rounded-md p-1 transition-colors hover:text-emerald-600", feedback === 1 && "text-emerald-600")}>
            <ThumbsUp size={14} />
          </button>
          <button onClick={() => sendFeedback(-1)} title="Not useful"
            className={cn("rounded-md p-1 transition-colors hover:text-gray-700", feedback === -1 && "text-gray-700")}>
            <ThumbsDown size={14} />
          </button>
          <button onClick={() => setExpanded((e) => !e)} title="Details"
            className="ml-0.5 inline-flex items-center gap-0.5 text-xs hover:text-gray-700 transition-colors">
            <ChevronDown size={13} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
          <button onClick={dismiss} title="Dismiss" className="rounded-md p-1 hover:text-gray-700 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* depth on demand */}
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-[#F1F2F4] pt-3">
          {Object.keys(evidence).filter((k) => !k.startsWith("_")).length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">The numbers</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {Object.entries(evidence).filter(([k]) => !k.startsWith("_")).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-[#F1F2F4] py-0.5">
                    <span className="text-gray-400">{k.replace(/_/g, " ")}</span>
                    <span className="font-mono text-[#4B5563]">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {why && (
            <p className="flex items-start gap-1.5 text-xs text-gray-400">
              <HelpCircle size={12} className="mt-0.5 shrink-0" /> {why}
            </p>
          )}
        </div>
      )}
    </article>
  )
}
