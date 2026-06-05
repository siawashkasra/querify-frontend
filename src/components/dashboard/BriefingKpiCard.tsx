"use client"

// One KPI card: large mono value, period-over-period change coloured by
// good_direction (down can be good), growth trend, sparkline, caption.
// The whole card links to chat — every number is one click from a conversation.

import { DollarSign, Banknote, Briefcase, AlertTriangle, Hash, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/cn"
import Sparkline from "./Sparkline"
import type { BriefingKpiData } from "@/types"

const ICONS: Record<string, typeof DollarSign> = {
  revenue: DollarSign, cash: Banknote, pipeline: Briefcase, risk: AlertTriangle, count: Hash,
}
const GOOD = "#15803d"   // matches --color-success
const BAD = "#b91c1c"    // matches --color-danger

export default function BriefingKpiCard({ kpi, onExplore }: { kpi: BriefingKpiData; onExplore?: (q: string) => void }) {
  const Icon = ICONS[kpi.icon_hint] ?? Hash
  const isGood = kpi.is_good
  const tone = isGood === null ? "neutral" : isGood ? "good" : "bad"
  const Arrow = kpi.direction === "up" ? TrendingUp : kpi.direction === "down" ? TrendingDown : Minus
  const sparkColor = tone === "good" ? GOOD : tone === "bad" ? BAD : "#9CA3AF"
  const unavailable = kpi.status !== "ok"
  const exploreQuestion = `How has ${kpi.label} changed over time, and what is driving it?`

  return (
    <button
      onClick={() => onExplore?.(exploreQuestion)}
      disabled={!onExplore}
      className={cn(
        "group flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-white p-4 min-h-[160px] text-left",
        onExplore && "transition-all hover:border-brand/40 hover:shadow-sm cursor-pointer",
      )}
    >
      <div className="flex items-center gap-1.5 text-[var(--text-muted)] w-full">
        <Icon size={13} />
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate">{kpi.label}</span>
        {onExplore && <ArrowUpRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 text-brand transition-opacity" />}
      </div>

      {unavailable ? (
        <div className="flex flex-1 items-center text-sm text-[var(--text-muted)]">Unavailable</div>
      ) : (
        <>
          <span className="font-mono text-[26px] font-semibold leading-tight text-[var(--text)]">{kpi.formatted}</span>

          {kpi.delta_pct != null ? (
            <div className={cn("flex items-center gap-1 text-xs font-medium",
              tone === "good" && "text-success", tone === "bad" && "text-danger", tone === "neutral" && "text-[var(--text-muted)]")}>
              <Arrow size={12} />
              <span>{kpi.delta_pct > 0 ? "+" : ""}{kpi.delta_pct}%</span>
              <span className="font-normal text-[var(--text-muted)]">vs previous</span>
            </div>
          ) : (
            <div className="text-xs text-[var(--text-muted)]">No prior period</div>
          )}

          {kpi.trend && kpi.trend.direction !== "flat" && (
            <p className="text-[11px] text-[var(--text-muted)]">{kpi.trend.label}</p>
          )}

          {kpi.sparkline?.length >= 2 && (
            <div className="mt-auto pt-1">
              <Sparkline points={kpi.sparkline} color={sparkColor} width={180} height={32} />
            </div>
          )}
          {kpi.caption && <p className="text-[11px] text-[var(--text-muted)] truncate">{kpi.caption}</p>}
        </>
      )}
    </button>
  )
}
