"use client"

import { AlertTriangle } from "lucide-react"
import type { AnswerCell } from "@/types"
import { formatByField } from "@/lib/formatNumber"
import { cn } from "@/lib/cn"

interface KpiItem {
  label: string
  value: string | number
  formatted?: string | null
  delta?: number | null
  delta_label?: string | null
  currency?: string | null
  unit?: string | null
}

interface Props {
  cell: AnswerCell
}

export function MetricsCell({ cell }: Props) {
  const cards = (cell.payload.cards as KpiItem[]) ?? []
  // FIX 3 — a truth-gated value renders hedged, and when struck it is small +
  // struck-through inside a warning block (never a hero metric card).
  const warning = Boolean(cell.payload.warning)
  const struck = Boolean(cell.payload.struck)
  const warningReason = cell.payload.warning_reason as string | undefined
  // FIX 4 — render the measure's currency code (from the model), never a $.
  const currency = (cell.payload.currency as string | undefined) ?? undefined

  if (!cards.length) return null

  return (
    <div className="mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {cards.map((card, i) => {
          const isPositive = card.delta != null && card.delta > 0
          const isNegative = card.delta != null && card.delta < 0
          // FIX 3b / FIX 4 — never a raw float: prefer the backend-formatted
          // string, else format by label with the measure's currency code.
          const display = card.formatted ?? formatByField(card.value, card.label, { currency: card.currency ?? currency, unit: card.unit })
          return (
            <div
              key={i}
              className={cn(
                "rounded-lg border",
                struck ? "p-2.5" : "p-3",
                warning
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              )}
              title={typeof card.value === "number" ? String(card.value) : undefined}
            >
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{card.label}</p>
              <p className={cn(
                "tabular-nums",
                // struck-through and small: the number is never the hero here
                struck ? "text-sm font-medium line-through decoration-amber-500/70" : "text-lg font-semibold",
                warning ? "text-amber-700 dark:text-amber-300" : "text-gray-900 dark:text-gray-100"
              )}>
                {display}
              </p>
              {card.delta != null && (
                <p className={`text-xs mt-1 ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"}`}>
                  {isPositive ? "▲" : isNegative ? "▼" : "–"}{" "}
                  {Math.abs(card.delta).toFixed(1)}%
                  {card.delta_label ? ` ${card.delta_label}` : ""}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {warning && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{warningReason || "This figure looks anomalous — verify before relying on it."}</span>
        </div>
      )}
    </div>
  )
}
