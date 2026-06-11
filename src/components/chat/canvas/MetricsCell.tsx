"use client"

import type { AnswerCell } from "@/types"

interface KpiItem {
  label: string
  value: string | number
  delta?: number | null
  delta_label?: string | null
}

interface Props {
  cell: AnswerCell
}

export function MetricsCell({ cell }: Props) {
  const cards = (cell.payload.cards as KpiItem[]) ?? []

  if (!cards.length) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((card, i) => {
        const isPositive = card.delta != null && card.delta > 0
        const isNegative = card.delta != null && card.delta < 0
        return (
          <div key={i} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">{card.label}</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{card.value}</p>
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
  )
}
