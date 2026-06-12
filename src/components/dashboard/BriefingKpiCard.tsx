"use client"

// U8 — one KPI card on the U3 MetricsCell anatomy: eyebrow label, font-data hero
// value with the verified trust underline, delta chip coloured by good_direction
// (down can be good), neutral sparkline (texture, not a semaphore), humanized
// context line. The whole card links to chat — every number is one click from a
// conversation.

import { ArrowUpRight } from "lucide-react"
import { cn } from "@/lib/cn"
import { labelize } from "@/lib/labelize"
import Sparkline from "./Sparkline"
import { DeltaChip } from "@/components/chat/canvas/DeltaChip"
import type { BriefingKpiData } from "@/types"

export default function BriefingKpiCard({ kpi, onExplore }: { kpi: BriefingKpiData; onExplore?: (q: string) => void }) {
  const unavailable = kpi.status !== "ok"
  const exploreQuestion = `How has ${kpi.label} changed over time, and what is driving it?`
  // good_direction lets the delta chip judge correctly; the briefing carries
  // is_good, so map back to a direction the chip understands.
  const goodDir = kpi.is_good == null ? null : kpi.direction === "up" ? (kpi.is_good ? "up" : "down") : (kpi.is_good ? "down" : "up")

  return (
    <button
      onClick={() => onExplore?.(exploreQuestion)}
      disabled={!onExplore}
      className={cn(
        "group flex flex-col gap-2 rounded-card border border-line bg-surface shadow-rest p-4 min-h-[160px] text-left",
        onExplore && "transition-all hover:border-violet/40 cursor-pointer",
      )}
    >
      {/* eyebrow */}
      <div className="flex items-center gap-1.5 text-ink-dim w-full">
        <span className="text-[11px] font-medium uppercase tracking-wide truncate">{labelize(kpi.label)}</span>
        {onExplore && <ArrowUpRight size={12} className="ml-auto opacity-0 group-hover:opacity-100 text-violet transition-opacity" />}
      </div>

      {unavailable ? (
        <div className="flex flex-1 items-center text-sm text-ink-dim">Unavailable</div>
      ) : (
        <>
          {/* hero value — mono, tabular, verified trust underline */}
          <span className="num-verified text-[2.25rem] leading-none font-medium text-ink">{kpi.formatted}</span>

          {kpi.delta_pct != null ? (
            <div className="flex items-center gap-1.5">
              <DeltaChip delta={kpi.delta_pct} goodDirection={goodDir} />
              <span className="text-xs text-ink-dim">vs previous</span>
            </div>
          ) : (
            <div className="text-xs text-ink-dim">No prior period</div>
          )}

          {kpi.trend && kpi.trend.direction !== "flat" && (
            <p className="text-[11px] text-ink-dim">{kpi.trend.label}</p>
          )}

          {kpi.sparkline?.length >= 2 && (
            <div className="mt-auto pt-1">
              <Sparkline points={kpi.sparkline} width={180} height={32} />
            </div>
          )}
          {kpi.caption && <p className="text-[11px] text-ink-dim truncate">{kpi.caption}</p>}
        </>
      )}
    </button>
  )
}
