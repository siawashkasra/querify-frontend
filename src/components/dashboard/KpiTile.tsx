"use client"

import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/cn"
import Sparkline from "./Sparkline"
import type { DashboardKpi } from "@/types"

const GOOD = "#16a34a"
const BAD = "#dc2626"

export default function KpiTile({ kpi }: { kpi: DashboardKpi }) {
  const isGood = kpi.is_good
  const tone = isGood === null ? "neutral" : isGood ? "good" : "bad"
  const sparkColor = tone === "good" ? GOOD : tone === "bad" ? BAD : "var(--brand)"
  const Arrow = kpi.direction === "up" ? TrendingUp : kpi.direction === "down" ? TrendingDown : Minus

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-4 min-h-[120px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] truncate" title={kpi.why || kpi.name}>
          {kpi.name}
        </span>
        {kpi.sparkline?.length >= 2 && <Sparkline points={kpi.sparkline} color={sparkColor} />}
      </div>

      <span className="text-3xl font-semibold font-mono leading-tight text-[var(--text)]">
        {kpi.status === "ok" || kpi.status === null ? kpi.formatted : "···"}
      </span>

      {kpi.delta_pct != null ? (
        <div className={cn("flex items-center gap-1 text-xs font-medium",
          tone === "good" && "text-success", tone === "bad" && "text-danger", tone === "neutral" && "text-[var(--text-muted)]")}>
          <Arrow size={13} />
          <span>{kpi.delta_pct > 0 ? "+" : ""}{kpi.delta_pct}%</span>
          <span className="text-[var(--text-muted)] font-normal">vs prior period</span>
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)]">{kpi.status === "ok" ? "No prior data" : "Loading…"}</div>
      )}
    </div>
  )
}
