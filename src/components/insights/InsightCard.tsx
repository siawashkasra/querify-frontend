"use client"

import { useCallback } from "react"
import { formatDistanceToNow } from "date-fns"
import { X } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
} from "recharts"
import { insights as insightsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import type { Insight, InsightType } from "@/types"

const TYPE_CONFIG: Record<InsightType, { label: string; className: string }> = {
  revenue_trend: { label: "Revenue", className: "bg-blue-50 text-blue-700 border-blue-200" },
  new_users: { label: "Growth", className: "bg-success/10 text-success border-success/20" },
  churn_signal: { label: "Churn", className: "bg-danger/10 text-danger border-danger/20" },
  top_performer: { label: "Top performer", className: "bg-[var(--brand-light)] text-brand border-brand/20" },
  anomaly: { label: "Anomaly", className: "bg-warning/10 text-warning border-warning/20" },
}

const CONFIDENCE_CONFIG = {
  high: { label: "High confidence", className: "bg-success/10 text-success border-success/20" },
  medium: { label: "Medium confidence", className: "bg-warning/10 text-warning border-warning/20" },
  low: { label: "Low confidence", className: "bg-[var(--text-muted)]/10 text-[var(--text-muted)] border-[var(--text-muted)]/20" },
}

function MiniChart({ insight }: { insight: Insight }) {
  if (!insight.chart_config || !insight.data_snapshot) return null
  const { type, x_field, y_field } = insight.chart_config
  const rawRows = Array.isArray(insight.data_snapshot?.rows) ? insight.data_snapshot.rows as Record<string, unknown>[] : []
  if (rawRows.length < 2) return null

  const common = { data: rawRows, margin: { top: 4, right: 4, left: 0, bottom: 0 } }
  const color = "#7c3aed"

  return (
    <div className="h-[120px] w-full pointer-events-none select-none">
      <ResponsiveContainer width="100%" height={120}>
        {type === "bar" ? (
          <BarChart {...common} barSize={12}>
            <Bar dataKey={y_field} fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : type === "area" ? (
          <AreaChart {...common}>
            <defs>
              <linearGradient id={`mg-${insight.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area dataKey={y_field} stroke={color} strokeWidth={1.5} fill={`url(#mg-${insight.id})`} type="monotone" dot={false} />
          </AreaChart>
        ) : (
          <LineChart {...common}>
            <Line dataKey={y_field} stroke={color} strokeWidth={1.5} dot={false} type="monotone" />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

interface InsightCardProps {
  insight: Insight
  onOpenModal: (insight: Insight) => void
  compact?: boolean
}

export const InsightCard = ({ insight, onOpenModal, compact }: InsightCardProps) => {
  const qc = useQueryClient()
  const typeConf = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.anomaly
  const confConf = CONFIDENCE_CONFIG[insight.confidence] ?? CONFIDENCE_CONFIG.medium
  const isUnread = !insight.is_read

  const markReadMutation = useMutation({
    mutationFn: () => insightsApi.markRead(insight.id),
    onMutate: () => {
      qc.setQueriesData<Insight[]>({ queryKey: ["insights"] }, (old) =>
        old?.map((ins) => ins.id === insight.id ? { ...ins, is_read: true } : ins)
      )
    },
  })

  const dismissMutation = useMutation({
    mutationFn: () => insightsApi.dismiss(insight.id),
    onMutate: () => {
      qc.setQueriesData<Insight[]>({ queryKey: ["insights"] }, (old) =>
        old?.filter((ins) => ins.id !== insight.id)
      )
    },
  })

  const handleOpen = useCallback(() => {
    onOpenModal(insight)
    if (isUnread) markReadMutation.mutate()
  }, [insight, isUnread, onOpenModal, markReadMutation])

  const ts = insight.generated_at || insight.created_at
  const timeAgo = ts ? formatDistanceToNow(new Date(ts), { addSuffix: true }) : null

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 rounded-lg border bg-white p-4 transition-shadow hover:shadow-sm cursor-pointer group",
        isUnread ? "border-l-[3px] border-l-brand border-[var(--border)]" : "border-[var(--border)]",
        compact && "min-w-[220px] max-w-[260px] shrink-0"
      )}
      onClick={handleOpen}
    >
      <button
        onClick={(e) => { e.stopPropagation(); dismissMutation.mutate() }}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-[var(--text-muted)] hover:text-danger hover:bg-danger/5"
        title="Dismiss"
      >
        <X size={12} />
      </button>

      <div className="flex items-center gap-1.5 flex-wrap pr-5">
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border", typeConf.className)}>
          {typeConf.label}
        </span>
        <span className={cn("inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border", confConf.className)}>
          {confConf.label}
        </span>
      </div>

      <p className={cn("text-sm font-medium text-[var(--text)] leading-snug", compact && "line-clamp-2")}>
        {insight.headline || insight.title}
      </p>
      <p className="text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
        {insight.summary || insight.description}
      </p>

      {!compact && <MiniChart insight={insight} />}

      <span className="text-[11px] text-[var(--text-muted)] mt-auto">{timeAgo}</span>
    </div>
  )
}

export default InsightCard
