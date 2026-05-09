"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ArrowDownRight, ArrowRight, ArrowUpRight, MessageSquareQuote, ThumbsDown, ThumbsUp, X } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from "recharts"
import { insights as insightsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import type { ChartConfig, Insight, InsightType } from "@/types"

function firstSentence(text: string, maxLen = 80): string {
  const t = text.trim()
  if (!t) return ""
  const ix = t.indexOf(".")
  const s =
    ix > 0
      ? t.slice(0, ix + 1).trim()
      : t
          .split(/\s+/)
          .slice(0, 12)
          .join(" ")
  if (s.length <= maxLen) return s.endsWith(".") ? s : s + "."
  return s.slice(0, maxLen).trimEnd() + "…"
}

function asNum(v: unknown): number | undefined {
  if (typeof v === "number" && !Number.isNaN(v)) return v
  if (typeof v === "string") {
    const n = Number(v.replace(/[$,]/g, ""))
    if (!Number.isNaN(n)) return n
  }
  return undefined
}

function getChartRows(insight: Insight): Record<string, unknown>[] {
  const cc = insight.chart_config
  const fromConfig = cc?.data
  if (Array.isArray(fromConfig) && fromConfig.length >= 2) return fromConfig as Record<string, unknown>[]
  const snap = insight.data_snapshot
  const rows =
    snap && typeof snap === "object" && Array.isArray((snap as { rows?: unknown }).rows)
      ? (snap as { rows: unknown[] }).rows
      : null
  if (rows && rows.length >= 2) return rows as Record<string, unknown>[]
  return []
}

function sparklineRows(insight: Insight): Record<string, unknown>[] {
  const d = insight.chart_config?.data
  return Array.isArray(d) && d.length >= 2 ? (d as Record<string, unknown>[]) : []
}

function resolveXY(chart: ChartConfig | null): { x: string; y: string } {
  if (!chart) return { x: "period", y: "value" }
  const x = chart.x_field || chart.x_axis || "period"
  const y = chart.y_field || chart.y_axis || "value"
  return { x: String(x), y: String(y) }
}

function lastRowNumeric(rows: Record<string, unknown>[], yKey: string): number | undefined {
  for (let i = rows.length - 1; i >= 0; i--) {
    const v = asNum(rows[i][yKey])
    if (v !== undefined) return v
  }
  return undefined
}

function sigmaFromSummary(summary: string): number | undefined {
  const m = summary.match(/(\d+\.?\d*)\s*(?:sigma|standard\s+deviation|σ)/i)
  return m ? Number(m[1]) : undefined
}

export const TYPE_THEME: Record<InsightType, { bar: string; label: string; badge: string }> = {
  revenue_trend: { bar: "#3B82F6", label: "Revenue", badge: "bg-blue-600 text-white border-blue-700" },
  new_users: { bar: "#10B981", label: "Growth", badge: "bg-emerald-600 text-white border-emerald-700" },
  churn_signal: { bar: "#EF4444", label: "Churn", badge: "bg-red-600 text-white border-red-700" },
  top_performer: { bar: "#8B5CF6", label: "Top performer", badge: "bg-violet-600 text-white border-violet-700" },
  anomaly: { bar: "#F59E0B", label: "Anomaly", badge: "bg-amber-500 text-black border-amber-600" },
  recurring_question: { bar: "#6366f1", label: "Trending question", badge: "bg-indigo-600 text-white border-indigo-700" },
}

const CONFIDENCE: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  low: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]",
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)
}

function headlineFirstNumber(h: string): string {
  const m = h.match(/[\d,]+(?:\.\d+)?/)
  return m ? m[0] : "—"
}

export function buildKpi(insight: Insight): {
  primary: string
  changePct: number | undefined
  dir: "up" | "down" | "flat"
  prevLine: string | null
  periodCaption: string | null
} {
  const snap = insight.data_snapshot as Record<string, unknown> | null
  const currency = !!snap?.currency
  const cur = snap ? asNum(snap.current_value) : undefined
  const prev = snap ? asNum(snap.previous_value) : undefined
  const pctRaw = snap ? snap.change_pct : undefined
  let changePct = typeof pctRaw === "number" ? pctRaw : pctRaw !== undefined ? asNum(pctRaw) : undefined
  const dirRaw = snap && typeof snap.change_direction === "string" ? snap.change_direction : ""
  let dir: "up" | "down" | "flat" =
    dirRaw === "down" ? "down" : dirRaw === "up" ? "up" : "flat"

  const rows = getChartRows(insight)
  const keys = insight.chart_config ? resolveXY(insight.chart_config) : { x: "period", y: "value" }
  const fallbackVal = rows.length >= 1 ? lastRowNumeric(rows, keys.y) : undefined

  if (changePct === undefined && cur !== undefined && prev !== undefined && Math.abs(prev) > 1e-9)
    changePct = ((cur - prev) / prev) * 100
  if (dir === "flat" && changePct !== undefined && !Number.isNaN(changePct)) {
    if (changePct > 2) dir = "up"
    else if (changePct < -2) dir = "down"
    else dir = "flat"
  }

  switch (insight.type) {
    case "top_performer": {
      const top = snap?.top_items
      let nameStr = ""
      let valNum: number | undefined
      if (Array.isArray(top) && top[0] && typeof top[0] === "object") {
        const t0 = top[0] as Record<string, unknown>
        nameStr = String(t0.name ?? t0.customer_id ?? t0.plan ?? "").trim()
        valNum = asNum(t0.value ?? t0.total ?? t0.total_revenue)
      }
      if (!nameStr || valNum === undefined) {
        const r0 = rows[0]
        if (r0) {
          nameStr = String(r0.name ?? r0.customer_id ?? r0.period ?? "").trim() || "Top"
          valNum = asNum(r0.total ?? r0.value ?? r0[keys.y]) ?? fallbackVal
        }
      }
      const valLabel = currency || insight.chart_config?.format === "currency" ? formatUsd(valNum ?? 0) : String(Math.round(valNum ?? 0))
      return {
        primary: nameStr ? `${nameStr}\u00a0—\u00a0${valLabel}` : valLabel,
        changePct,
        dir,
        prevLine:
          prev !== undefined && insight.chart_config?.format === "currency"
            ? `was ${formatUsd(prev)}`
            : prev !== undefined && !currency
              ? `was ${Math.round(prev)}`
              : null,
        periodCaption:
          typeof snap?.previous_period_label === "string" ? `vs ${snap.previous_period_label}` : "vs portfolio",
      }
    }
    case "new_users":
    case "churn_signal":
    case "revenue_trend": {
      const primaryNum = cur ?? fallbackVal ?? 0
      const lbl =
        insight.type === "new_users"
          ? `${Math.round(primaryNum)}\u00a0users`
          : insight.type === "churn_signal"
            ? `${Math.round(primaryNum)}\u00a0churned`
            : currency || insight.chart_config?.format === "currency"
              ? formatUsd(primaryNum)
              : String(Math.round(primaryNum))
      return {
        primary: lbl,
        changePct,
        dir,
        prevLine:
          prev !== undefined &&
          (currency || insight.type === "revenue_trend" || insight.chart_config?.format === "currency")
            ? `was ${currency || insight.chart_config?.format === "currency" ? formatUsd(prev) : String(Math.round(prev))}`
            : prev !== undefined
              ? `was ${Math.round(prev)}`
              : null,
        periodCaption:
          typeof snap?.previous_period_label === "string"
            ? `vs ${snap.previous_period_label}`
            : insight.type === "new_users"
              ? "vs last week"
              : "vs prior period",
      }
    }
    case "anomaly": {
      const zRaw = sigmaFromSummary(insight.summary) ?? asNum(snap?.z_score ?? snap?.sigma)
      const z = zRaw !== undefined ? Math.round(zRaw * 10) / 10 : undefined
      const v = fallbackVal ?? cur
      const zSigma = z !== undefined ? `${z}\u03c3 ${z >= 0 ? "above" : "below"} normal` : null
      const primary =
        v !== undefined
          ? Intl.NumberFormat().format(Math.round(v))
          : insight.headline || insight.title || headlineFirstNumber(insight.headline)
      return {
        primary,
        changePct,
        dir,
        prevLine: null,
        periodCaption: zSigma ?? (typeof snap?.current_period_label === "string" ? String(snap.current_period_label) : "Vs baseline"),
      }
    }
    case "recurring_question":
    default: {
      return {
        primary: insight.headline || insight.title || "—",
        changePct,
        dir,
        prevLine: prev !== undefined ? String(prev) : null,
        periodCaption:
          typeof snap?.current_period_label === "string"
            ? String(snap.current_period_label)
            : null,
      }
    }
  }
}

function Sparkline({ insight }: { insight: Insight }) {
  const rows = sparklineRows(insight)
  if (rows.length < 2 || !insight.chart_config) return null
  const theme = TYPE_THEME[insight.type] ?? TYPE_THEME.anomaly
  const { y } = resolveXY(insight.chart_config)
  const t = insight.chart_config.type
  const baseOp = 0.7
  const lastIdx = rows.length - 1
  const hlLast = !!insight.chart_config.highlight_last
  const hlFirst = !!insight.chart_config.highlight_first
  const common = {
    data: rows,
    margin: { top: 2, right: 4, bottom: 2, left: 0 },
  }

  return (
    <div className="h-[100px] w-full select-none [&_.recharts-surface]:outline-none pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        {t === "bar" ? (
          <BarChart {...common} barSize={10}>
            <Bar dataKey={y} radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {rows.map((_, i) => {
                const hi = hlLast ? i === lastIdx : hlFirst ? i === 0 : false
                return (
                  <Cell
                    key={i}
                    fill={theme.bar}
                    fillOpacity={hi ? 1 : baseOp}
                  />
                )
              })}
            </Bar>
          </BarChart>
        ) : t === "area" ? (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={`sp-${insight.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.bar} stopOpacity={baseOp * 0.85} />
                <stop offset="100%" stopColor={theme.bar} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={y} stroke={theme.bar} strokeWidth={2} strokeOpacity={baseOp} fill={`url(#sp-${insight.id})`} dot={false} isAnimationActive={false} />
          </AreaChart>
        ) : (
          <LineChart {...common}>
            <Line type="monotone" dataKey={y} stroke={theme.bar} strokeOpacity={baseOp} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

export { InsightCardSkeleton } from "./InsightCardSkeleton"

interface InsightCardProps {
  insight: Insight
  onOpenModal: (insight: Insight) => void
  compact?: boolean
}

export function InsightCard({ insight, onOpenModal, compact }: InsightCardProps) {
  const qc = useQueryClient()
  const theme = TYPE_THEME[insight.type] ?? TYPE_THEME.anomaly
  const confClass = CONFIDENCE[insight.confidence] ?? CONFIDENCE.medium
  const isUnread = !insight.is_read
  const [expandedSummary, setExpandedSummary] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<1 | -1 | null>(insight.feedback_score ?? null)
  const [showContextPrompt, setShowContextPrompt] = useState(false)

  const kpi = useMemo(() => buildKpi(insight), [insight])
  const hasChart = sparklineRows(insight).length >= 2
  const headline = insight.headline || insight.title || ""

  const markReadMutation = useMutation({
    mutationFn: () => insightsApi.markRead(insight.id),
    onMutate: () => {
      qc.setQueriesData({ queryKey: ["insights"] }, (old: Insight[] | undefined) => old?.map((ins) => (ins.id === insight.id ? { ...ins, is_read: true } : ins)))
    },
  })

  const dismissMutation = useMutation({
    mutationFn: () => insightsApi.dismiss(insight.id),
    onMutate: () => {
      qc.setQueriesData({ queryKey: ["insights"] }, (old: Insight[] | undefined) => old?.filter((ins) => ins.id !== insight.id))
    },
  })

  const feedbackMutation = useMutation({
    mutationFn: ({ score, isUserDefined }: { score: 1 | -1; isUserDefined: boolean }) =>
      insightsApi.submitFeedback(insight.connection_id, insight.id, { feedback_score: score, is_user_defined_metric: isUserDefined }),
    onSuccess: (data: { needs_context_review: boolean }, vars) => {
      setFeedbackGiven(vars.score)
      if (data.needs_context_review) setShowContextPrompt(true)
    },
  })

  const handleFeedback = useCallback(
    (score: 1 | -1, e: React.MouseEvent) => {
      e.stopPropagation()
      if (feedbackGiven !== null) return
      feedbackMutation.mutate({ score, isUserDefined: insight.is_user_defined_metric ?? false })
    },
    [feedbackGiven, feedbackMutation, insight.is_user_defined_metric],
  )

  const handleCardClick = useCallback(() => {
    onOpenModal(insight)
    if (isUnread) markReadMutation.mutate()
  }, [insight, isUnread, markReadMutation, onOpenModal])

  const ts = insight.generated_at || insight.created_at
  const timeAgo = ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : ""

  const followDraft = encodeURIComponent(`Tell me more about: ${headline}`)
  const chatHref =
    `/chat/new?draft=${followDraft}&connection=${encodeURIComponent(insight.connection_id)}`

  const summaryText = insight.summary || insight.description || ""
  const summaryPreview = firstSentence(summaryText, 80)
  const reco = insight.recommendation ?? null
  const showExpand = compact ? false : (summaryText.length > summaryPreview.replace("…", "").length || !!reco)

  const showChangeBadge =
    (insight.type === "revenue_trend" || insight.type === "new_users" || insight.type === "churn_signal") &&
    kpi.changePct !== undefined &&
    !Number.isNaN(kpi.changePct)
  const changeBadge = showChangeBadge ? (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap",
          kpi.dir === "up" ? "bg-emerald-600 text-white" : kpi.dir === "down" ? "bg-red-600 text-white" : "bg-slate-400 text-white",
        )}
      >
        {kpi.dir === "up" ? (
          <ArrowUpRight size={14} aria-hidden />
        ) : kpi.dir === "down" ? (
          <ArrowDownRight size={14} aria-hidden />
        ) : (
          <ArrowRight size={14} aria-hidden />
        )}
        {kpi.dir !== "flat" ? `${Math.abs(kpi.changePct ?? 0) >= 100 ? `${(kpi.changePct ?? 0) > 0 ? "+" : ""}${Number(kpi.changePct).toFixed(0)}` : `${(kpi.changePct ?? 0) > 0 ? "+" : ""}${Number(kpi.changePct).toFixed(1)}`}%` : null}
      </span>
    ) : null

  return (
    <div className={cn(compact ? "min-w-[240px]" : "")}>
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "group relative flex flex-col rounded-lg border bg-[var(--surface)] overflow-hidden min-h-[300px]",
          "transition-[box-shadow,border-color,background-color] duration-200",
          compact ? "" : "hover:shadow-md hover:border-[var(--border-2)]",
          isUnread ? `border-[var(--border)] bg-[var(--surface)] border-l-[3px] brightness-[1.01]` : "border-[var(--border)] bg-[var(--surface-2)]",
        )}
        style={isUnread ? { borderLeftColor: theme.bar } : undefined}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            handleCardClick()
          }
        }}
      >
        {isUnread ? (
          <span className="absolute top-4 right-[4.75rem] h-2 w-2 rounded-full bg-[#2563eb] shadow-sm z-10" aria-hidden />
        ) : null}

        <div className="h-2 w-full shrink-0" style={{ backgroundColor: theme.bar }} aria-hidden />

        <div className={cn("p-4 flex flex-col gap-3 flex-1", compact ? "gap-2 p-3" : "")}>
          <div className={cn("flex items-start justify-between gap-2", compact && "gap-1.5")}>
            <span
              className={cn(
                "inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border uppercase tracking-wide",
                theme.badge,
              )}
            >
              {theme.label}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className={cn("inline-flex px-2 py-0.5 rounded-full border text-[10px] font-medium", confClass)}>
                {insight.confidence === "high" ? "High" : insight.confidence === "medium" ? "Medium" : "Low"}
              </span>
              {timeAgo ? <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline whitespace-nowrap">{timeAgo}</span> : null}
            </div>
          </div>

          <div
            className={cn(
              "rounded-xl border border-[var(--border)] px-4 py-3 shadow-sm bg-[var(--surface)]",
              compact ? "py-2 px-3" : "",
            )}
          >
            <p className={cn("font-mono font-bold tracking-tight text-[var(--text)] leading-none", compact ? "text-2xl" : "text-[32px]")}
              style={{ color: theme.bar }}
            >
              {kpi.primary}
            </p>
            {changeBadge ? (
              <div className={cn("mt-2 flex flex-wrap items-center gap-2")}>{changeBadge}</div>
            ) : null}
            {kpi.periodCaption ? (
              <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">{kpi.periodCaption}</p>
            ) : null}
            {kpi.prevLine ? (
              <p className={cn("text-[13px] text-[var(--text-muted)] mt-1", compact && "text-xs")}>{kpi.prevLine}</p>
            ) : null}
          </div>

          <p className={cn("font-medium text-[15px] leading-snug text-[var(--text)]", compact ? "text-sm line-clamp-2" : "")}>
            {headline}
          </p>

          {!compact && hasChart ? (
            <>
              <div className="-mx-1">
                <Sparkline insight={insight} />
              </div>
            </>
          ) : null}

          {!compact && summaryText ? (
            <div className="text-[13px] text-[var(--text-dim)] space-y-1" onClick={(e) => e.stopPropagation()}>
              {!expandedSummary ? (
                <>
                  <p className={cn("leading-relaxed")}>{summaryPreview}</p>
                  {showExpand ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedSummary(true)
                      }}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Show more
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className={cn("leading-relaxed whitespace-pre-wrap")}>{summaryText}</p>
                  {reco ? (
                    <p className={cn("text-[var(--text)] mt-2 font-medium")}>{reco}</p>
                  ) : null}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setExpandedSummary(false)
                    }}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Show less
                  </button>
                </>
              )}
            </div>
          ) : compact && summaryText ? (
            <p className={cn("text-xs text-[var(--text-dim)] line-clamp-2")}>{firstSentence(summaryText, 96)}</p>
          ) : null}

          {showContextPrompt ? (
            <div className={cn("rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11px]")} onClick={(e) => e.stopPropagation()}>
              <p className={cn("font-semibold mb-1.5 text-[var(--text)]")}>Incorrect data definition?</p>
              <div className={cn("flex gap-2")}>
                <button type="button" onClick={() => { insightsApi.flagContextReview(insight.connection_id, insight.id); setShowContextPrompt(false) }} className="px-2 py-1 rounded bg-amber-200 font-medium">
                  Flag for review
                </button>
                <button type="button" onClick={() => setShowContextPrompt(false)} className={cn("px-2 py-1 rounded bg-[var(--surface-3)]")}>
                  Close
                </button>
              </div>
            </div>
          ) : null}

          {!compact ? (
            <div className="mt-auto pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <span className={cn("text-[11px] text-[var(--text-muted)]")}>{timeAgo}</span>
              <div className={cn("flex items-center gap-1 flex-wrap justify-end")}>
                <button
                  type="button"
                  className={cn("p-1.5 rounded text-[var(--text-muted)] hover:text-success")}
                  aria-label="Helpful"
                  disabled={feedbackGiven !== null}
                  onClick={(e) => handleFeedback(1, e)}
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  type="button"
                  className={cn("p-1.5 rounded text-[var(--text-muted)] hover:text-danger")}
                  aria-label="Not helpful"
                  disabled={feedbackGiven !== null}
                  onClick={(e) => handleFeedback(-1, e)}
                >
                  <ThumbsDown size={14} />
                </button>
                <Link
                  href={chatHref}
                  onClick={(e) => { e.stopPropagation() }}
                  className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand text-white text-xs font-semibold hover:bg-brand-dark transition-colors")}
                >
                  <MessageSquareQuote size={14} />
                  Ask follow-up
                </Link>
                <button
                  type="button"
                  className={cn("p-1.5 rounded text-[var(--text-muted)] hover:text-danger")}
                  aria-label="Dismiss insight"
                  onClick={(e) => {
                    e.stopPropagation()
                    dismissMutation.mutate()
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className={cn("mt-auto flex justify-end gap-2 text-[var(--text-muted)]")}>
              <span className="text-[10px]">{timeAgo}</span>
              <button
                type="button"
                aria-label="Dismiss"
                className="p-1"
                onClick={(e) => {
                  e.stopPropagation()
                  dismissMutation.mutate()
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default InsightCard
