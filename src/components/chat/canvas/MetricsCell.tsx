"use client"

import { AlertTriangle } from "lucide-react"
import type { AnswerCell } from "@/types"
import { formatByField } from "@/lib/formatNumber"
import { numClass } from "@/lib/numTrust"
import { cn } from "@/lib/cn"
import { DeltaChip } from "./DeltaChip"

interface KpiItem {
  label: string
  value: string | number
  formatted?: string | null
  delta?: number | null
  delta_label?: string | null
  good_direction?: "up" | "down" | null
  currency?: string | null
  unit?: string | null
  context?: string | null
}

interface Props {
  cell: AnswerCell
}

// U3 — hero number cards. The value is the protagonist: big, mono, tabular, with
// the trust underline from numClass(). One card sits at max-w 320px; two-to-four
// share an equal-column grid. Currency comes from the measure unit only — counts
// render as bare numbers.
export function MetricsCell({ cell }: Props) {
  const cards = (cell.payload.cards as KpiItem[]) ?? []
  const warning = Boolean(cell.payload.warning)
  const struck = Boolean(cell.payload.struck)
  const warningReason = cell.payload.warning_reason as string | undefined
  const currency = (cell.payload.currency as string | undefined) ?? undefined
  const trust = numClass(cell.payload.routing_path as string | undefined)

  if (!cards.length) return null

  const single = cards.length === 1

  return (
    <div className="mb-2">
      <div
        className={cn(
          single
            ? "max-w-[320px]"
            : "grid grid-cols-2 lg:grid-cols-4 gap-3"
        )}
      >
        {cards.map((card, i) => {
          const display =
            card.formatted ??
            formatByField(card.value, card.label, { currency: card.currency ?? currency, unit: card.unit })
          const context = card.context ?? null
          return (
            <div
              key={i}
              className={cn(
                "rounded-card border bg-surface shadow-rest",
                struck ? "p-3" : "p-4",
                warning ? "border-caution/40 bg-caution/5" : "border-line"
              )}
              title={typeof card.value === "number" ? String(card.value) : undefined}
            >
              {/* eyebrow */}
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-dim mb-1.5 truncate">
                {card.label}
              </p>
              {/* hero value */}
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className={cn(
                    struck
                      ? "text-base font-medium line-through decoration-caution/70 font-data tabular-nums"
                      : cn("text-[2.25rem] leading-none font-medium", warning ? "text-caution" : "text-ink", trust)
                  )}
                >
                  {display}
                </span>
                {card.delta != null && !struck && (
                  <DeltaChip delta={card.delta} goodDirection={card.good_direction} label={card.delta_label} />
                )}
              </div>
              {/* humanized context line */}
              {context && <p className="text-xs text-ink-dim mt-2">{context}</p>}
            </div>
          )
        })}
      </div>
      {warning && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-caution">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{warningReason || "This figure looks anomalous — verify before relying on it."}</span>
        </div>
      )}
    </div>
  )
}
