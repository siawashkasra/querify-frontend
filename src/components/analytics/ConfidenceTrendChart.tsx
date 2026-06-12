"use client"

import { useMemo } from "react"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
} from "recharts"
import { format, parseISO } from "date-fns"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/cn"
import type { ConfidenceTrend, DailyAverage } from "@/types"

interface Props {
  trend: ConfidenceTrend
  className?: string
}

const TREND_CFG = {
  improving: { label: "Improving ↑", color: "text-success", Icon: TrendingUp },
  stable: { label: "Stable →", color: "text-[var(--text-muted)]", Icon: Minus },
  deteriorating: { label: "Declining ↓", color: "text-danger", Icon: TrendingDown },
} as const

function lineColor(avg: number | null): string {
  if (avg === null) return "#6b7280"
  if (avg >= 80) return "#22c55e"
  if (avg >= 60) return "#f59e0b"
  return "#ef4444"
}

interface TooltipPayload {
  payload?: { date: string; avg_score: number; query_count: number }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DailyAverage }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white shadow-float px-3 py-2 text-xs">
      <p className="font-medium text-[var(--text)] mb-1">{format(parseISO(d.date), "MMM d, yyyy")}</p>
      <p className="text-[var(--text-dim)]">Avg score: <span className="font-semibold">{d.avg_score}</span></p>
      <p className="text-[var(--text-dim)]">Queries: <span className="font-semibold">{d.query_count}</span></p>
    </div>
  )
}

export default function ConfidenceTrendChart({ trend, className }: Props) {
  const color = useMemo(() => lineColor(trend.overall_avg), [trend.overall_avg])
  const trendCfg = trend.trend_direction ? TREND_CFG[trend.trend_direction] : null

  if (!trend.daily_averages.length) {
    return (
      <div className={cn("flex items-center justify-center h-48 text-sm text-[var(--text-muted)]", className)}>
        Not enough data yet — run at least 5 successful queries.
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {trend.overall_avg !== null && (
            <span className="text-sm font-semibold text-[var(--text)]">Overall: {trend.overall_avg}</span>
          )}
          {trend.change_from_previous_period !== null && (
            <span className={cn("text-xs", trend.change_from_previous_period >= 0 ? "text-success" : "text-danger")}>
              {trend.change_from_previous_period >= 0 ? "+" : ""}{trend.change_from_previous_period}% vs prev period
            </span>
          )}
        </div>
        {trendCfg && (
          <span className={cn("flex items-center gap-1 text-xs font-medium", trendCfg.color)}>
            <trendCfg.Icon size={13} />
            {trendCfg.label}
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={trend.daily_averages} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            tickFormatter={(v) => format(parseISO(v), "MMM d")}
            minTickGap={20}
          />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceArea y1={60} y2={80} fill="#fef3c7" fillOpacity={0.4} />
          <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 3" label={{ value: "High", fontSize: 10, fill: "#22c55e", position: "insideTopRight" }} />
          <ReferenceLine y={60} stroke="#f59e0b" strokeDasharray="4 3" label={{ value: "Medium", fontSize: 10, fill: "#f59e0b", position: "insideBottomRight" }} />
          <Line type="monotone" dataKey="avg_score" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
