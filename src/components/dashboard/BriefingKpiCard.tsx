"use client"

import { DollarSign, Banknote, Briefcase, AlertTriangle, Hash, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/cn"
import Sparkline from "./Sparkline"
import type { BriefingKpiData } from "@/types"

const ICONS: Record<string, typeof DollarSign> = {
  revenue: DollarSign, cash: Banknote, pipeline: Briefcase, risk: AlertTriangle, count: Hash,
}
const GOOD = "#16a34a"
const BAD = "#dc2626"

export default function BriefingKpiCard({ kpi }: { kpi: BriefingKpiData }) {
  const Icon = ICONS[kpi.icon_hint] ?? Hash
  const isGood = kpi.is_good
  const tone = isGood === null ? "neutral" : isGood ? "good" : "bad"
  const Arrow = kpi.direction === "up" ? TrendingUp : kpi.direction === "down" ? TrendingDown : Minus
  const sparkColor = tone === "good" ? GOOD : tone === "bad" ? BAD : "#9CA3AF"
  const unavailable = kpi.status !== "ok"

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#E5E7EB] bg-white p-4 min-h-[150px]">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        <Icon size={13} />
        <span className="text-[11px] font-semibold uppercase tracking-wider truncate">{kpi.label}</span>
      </div>

      {unavailable ? (
        <div className="flex flex-1 items-center text-sm text-[#9CA3AF]">Unavailable</div>
      ) : (
        <>
          <span className="font-mono text-[26px] font-semibold leading-tight text-[#111827]">{kpi.formatted}</span>

          {kpi.delta_pct != null ? (
            <div className={cn("flex items-center gap-1 text-xs font-medium",
              tone === "good" && "text-emerald-600", tone === "bad" && "text-red-600", tone === "neutral" && "text-[#9CA3AF]")}>
              <Arrow size={12} />
              <span>{kpi.delta_pct > 0 ? "+" : ""}{kpi.delta_pct}%</span>
              <span className="font-normal text-[#9CA3AF]">vs previous</span>
            </div>
          ) : (
            <div className="text-xs text-[#9CA3AF]">No prior period</div>
          )}

          {kpi.sparkline?.length >= 2 && (
            <div className="mt-auto pt-1">
              <Sparkline points={kpi.sparkline} color={sparkColor} width={180} height={32} />
            </div>
          )}
          {kpi.caption && <p className="text-[11px] text-[#9CA3AF] truncate">{kpi.caption}</p>}
        </>
      )}
    </div>
  )
}
