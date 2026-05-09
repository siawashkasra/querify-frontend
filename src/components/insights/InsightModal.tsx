"use client"

import Link from "next/link"
import * as Dialog from "@radix-ui/react-dialog"
import { format } from "date-fns"
import { X, MessageSquareQuote, ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { InsightDetailChart } from "@/components/insights/InsightDetailChart"
import type { Insight, InsightType } from "@/types"
import { buildKpi, TYPE_THEME } from "@/components/insights/InsightCard"

const TYPE_LABELS: Record<InsightType, string> = {
  revenue_trend: "Revenue",
  new_users: "Growth",
  churn_signal: "Churn",
  top_performer: "Top performer",
  anomaly: "Anomaly",
  recurring_question: "Trending question",
}

const CONF_BADGE: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-900 border-amber-200",
  low: "bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]",
}

interface InsightModalProps {
  insight: Insight | null
  onClose: () => void
}

export const InsightModal = ({ insight, onClose }: InsightModalProps) => {
  const ts = insight?.generated_at || insight?.created_at
  const theme = insight ? TYPE_THEME[insight.type] ?? TYPE_THEME.anomaly : TYPE_THEME.anomaly
  const kpi = insight ? buildKpi(insight) : null
  const headline = insight?.headline || insight?.title || ""
  const chatHref = insight
    ? `/chat/new?draft=${encodeURIComponent(`Tell me more about: ${headline}`)}&connection=${encodeURIComponent(insight.connection_id)}`
    : "#"
  const reco = insight?.recommendation ?? null
  const confClass = insight ? CONF_BADGE[insight.confidence] ?? CONF_BADGE.medium : ""
  const showChangeBadge =
    insight &&
    (insight.type === "revenue_trend" || insight.type === "new_users") &&
    kpi &&
    kpi.changePct !== undefined &&
    !Number.isNaN(kpi.changePct)

  return (
    <Dialog.Root open={!!insight} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-3xl max-h-[88vh] overflow-y-auto overflow-x-hidden",
            "rounded-xl border border-[var(--border)] bg-white shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "duration-200"
          )}
        >
          <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors">
            <X size={16} />
          </Dialog.Close>

          {insight ? (
            <div className="flex flex-col gap-5 pr-2">
              <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border uppercase tracking-wide text-white shadow-sm", theme.badge)}>
                    {TYPE_LABELS[insight.type] ?? insight.type}
                  </span>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border", confClass)}>{insight.confidence}</span>
                </div>
                <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">
                  {ts ? format(new Date(ts), "MMM d, yyyy 'at' HH:mm") : ""}
                </span>
              </div>

              {kpi ? (
                <div className={cn("rounded-xl border border-[var(--border)] px-5 py-4 bg-[var(--surface-2)] shadow-inner")}>
                  <p className={cn("font-mono font-bold tracking-tight text-[var(--text)] text-[clamp(26px,3.5vw,36px)]")} style={{ color: theme.bar }}>
                    {kpi.primary}
                  </p>
                  {showChangeBadge && kpi ? (
                    <div className={cn("mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap", kpi.dir === "up" ? "bg-emerald-600 text-white" : kpi.dir === "down" ? "bg-red-600 text-white" : "bg-slate-400 text-white")}>
                      {kpi.dir === "up" ? <ArrowUpRight size={14} aria-hidden /> : kpi.dir === "down" ? <ArrowDownRight size={14} aria-hidden /> : <ArrowRight size={14} aria-hidden />}
                      {kpi.dir !== "flat" ? `${Math.abs(kpi.changePct ?? 0) >= 100 ? `${(kpi.changePct ?? 0) > 0 ? "+" : ""}${Number(kpi.changePct).toFixed(0)}` : `${(kpi.changePct ?? 0) > 0 ? "+" : ""}${Number(kpi.changePct).toFixed(1)}`}%` : null}
                    </div>
                  ) : null}
                  {kpi.periodCaption ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{kpi.periodCaption}</p> : null}
                  {kpi.prevLine ? <p className="mt-2 text-[13px] text-[var(--text-muted)]">{kpi.prevLine}</p> : null}
                </div>
              ) : null}

              <InsightDetailChart insight={insight} modalOpen={!!insight} />

              <div>
                <Dialog.Title className="text-[15px] font-medium leading-snug text-[var(--text)]">
                  {headline}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-[var(--text-dim)] leading-relaxed">
                  {insight.summary || insight.description}
                </Dialog.Description>
                {reco ? <p className="mt-3 text-sm font-medium text-[var(--text)]">{reco}</p> : null}
              </div>

              <div className="flex justify-end pt-2 border-t border-[var(--border)]">
                <Link
                  href={chatHref}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold hover:bg-brand-dark transition-colors min-h-[44px] touch-manipulation"
                >
                  <MessageSquareQuote size={16} />
                  Ask a follow-up question
                </Link>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default InsightModal
