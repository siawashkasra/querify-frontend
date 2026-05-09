"use client"

import { format } from "date-fns"
import { Calendar, MessageCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import type { Insight } from "@/types"

interface DigestData {
  id: string
  connection_id: string
  period: string
  period_start: string
  period_end: string
  narrative: string
  highlight_insights: Insight[]
  generated_at: string
}

interface DigestCardProps {
  digest: DigestData
  onOpenInsight: (insight: Insight) => void
  onAskQuestion: (question: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  revenue_trend: "Revenue",
  new_users: "Growth",
  churn_signal: "Churn",
  top_performer: "Top",
  anomaly: "Anomaly",
  recurring_question: "Trending",
}

export const DigestCard = ({ digest, onOpenInsight, onAskQuestion }: DigestCardProps) => {
  const periodLabel = digest.period === "weekly" ? "Weekly Digest" : "Monthly Digest"
  const dateRange = `${format(new Date(digest.period_start), "MMM d")} — ${format(new Date(digest.period_end), "MMM d, yyyy")}`
  const highlights = digest.highlight_insights.slice(0, 3)

  const handleAskQuestion = () => {
    onAskQuestion("Tell me more about this week in my business")
  }

  return (
    <div className="relative flex flex-col gap-4 rounded-lg border-2 border-brand/30 bg-gradient-to-br from-brand/5 to-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-brand" />
          <span className="text-xs font-semibold uppercase tracking-wider text-brand">{periodLabel}</span>
        </div>
        <span className="text-xs text-[var(--text-muted)]">{dateRange}</span>
      </div>

      <p className="text-base leading-relaxed text-[var(--text)]">
        {digest.narrative}
      </p>

      {highlights.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Key highlights this {digest.period === "weekly" ? "week" : "month"}
          </h4>
          <div className="flex flex-wrap gap-2">
            {highlights.map((insight) => (
              <button
                key={insight.id}
                onClick={() => onOpenInsight(insight)}
                className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-left transition-all hover:border-brand hover:shadow-sm"
              >
                <span className={cn("rounded-sm px-2 py-0.5 text-[10px] font-medium", {
                  "bg-blue-50 text-blue-700": insight.type === "revenue_trend",
                  "bg-success/10 text-success": insight.type === "new_users",
                  "bg-danger/10 text-danger": insight.type === "churn_signal",
                  "bg-brand/10 text-brand": insight.type === "top_performer",
                  "bg-warning/10 text-warning": insight.type === "anomaly",
                })}>
                  {TYPE_LABELS[insight.type] || insight.type}
                </span>
                <span className="text-xs text-[var(--text)] max-w-[280px] truncate">
                  {insight.headline}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleAskQuestion}
        className="flex items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90"
      >
        <MessageCircle size={16} />
        Ask a question about this {digest.period === "weekly" ? "week" : "month"}
      </button>
    </div>
  )
}

export default DigestCard
