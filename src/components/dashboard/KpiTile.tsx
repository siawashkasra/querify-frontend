"use client"

import { labelize } from "@/lib/labelize"
import Sparkline from "./Sparkline"
import { DeltaChip } from "@/components/chat/canvas/DeltaChip"
import type { DashboardKpi } from "@/types"

// U8 — KPI tile on the MetricsCell anatomy: eyebrow, mono hero with the verified
// trust underline, delta chip by good_direction, neutral sparkline.
export default function KpiTile({ kpi }: { kpi: DashboardKpi }) {
  const goodDir = kpi.is_good == null ? null : kpi.direction === "up" ? (kpi.is_good ? "up" : "down") : (kpi.is_good ? "down" : "up")

  return (
    <div className="flex flex-col gap-2 rounded-card border border-line bg-surface shadow-rest p-4 min-h-[120px]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-ink-dim truncate" title={kpi.why || kpi.name}>
          {labelize(kpi.name)}
        </span>
        {kpi.sparkline?.length >= 2 && <Sparkline points={kpi.sparkline} />}
      </div>

      <span className="num-verified text-[2rem] leading-tight font-medium text-ink">
        {kpi.status === "ok" || kpi.status === null ? kpi.formatted : "···"}
      </span>

      {kpi.delta_pct != null ? (
        <div className="flex items-center gap-1.5">
          <DeltaChip delta={kpi.delta_pct} goodDirection={goodDir} />
          <span className="text-xs text-ink-dim">vs prior period</span>
        </div>
      ) : (
        <div className="text-xs text-ink-dim">{kpi.status === "ok" ? "No prior data" : "Loading…"}</div>
      )}
    </div>
  )
}
