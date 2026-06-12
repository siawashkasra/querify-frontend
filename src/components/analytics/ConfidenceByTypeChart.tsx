"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"
import { cn } from "@/lib/cn"
import type { QuestionTypeStats } from "@/types"

interface Props {
  stats: QuestionTypeStats[]
  className?: string
}

function barColor(score: number): string {
  if (score >= 80) return "#22c55e"
  if (score >= 60) return "#f59e0b"
  return "#ef4444"
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: QuestionTypeStats }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-[var(--border)] bg-white shadow-float px-3 py-2 text-xs">
      <p className="font-medium text-[var(--text)] mb-1">{d.question_type}</p>
      <p className="text-[var(--text-dim)]">Avg confidence: <span className="font-semibold">{d.avg_confidence}</span></p>
      <p className="text-[var(--text-dim)]">Queries: <span className="font-semibold">{d.query_count}</span></p>
    </div>
  )
}

export default function ConfidenceByTypeChart({ stats, className }: Props) {
  if (!stats.length) {
    return (
      <div className={cn("flex items-center justify-center h-40 text-sm text-[var(--text-muted)]", className)}>
        No query data yet.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, stats.length * 44)} className={className}>
      <BarChart data={stats} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
        <YAxis type="category" dataKey="question_type" width={90} tick={{ fontSize: 11, fill: "var(--text-dim)" }} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="avg_confidence" radius={[0, 4, 4, 0]} barSize={18}>
          {stats.map((entry) => (
            <Cell key={entry.question_type} fill={barColor(entry.avg_confidence)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
