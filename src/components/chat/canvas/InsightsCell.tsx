"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
}

export function InsightsCell({ cell }: Props) {
  const items = (cell.payload.items as string[]) ?? []
  if (!items.length) return null

  return (
    <div className="mb-4 bg-violet-50 dark:bg-violet-950/30 rounded-lg p-4 border border-violet-100 dark:border-violet-900">
      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide mb-2">Key Insights</p>
      <ul className="space-y-1.5">
        {items.map((insight, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
            <span className="text-violet-500 mt-0.5 flex-shrink-0">•</span>
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
