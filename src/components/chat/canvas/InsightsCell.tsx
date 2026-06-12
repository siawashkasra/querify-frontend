"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
}

// U3 — insights as a quiet aside, not a colored box. A single 2px violet rule on
// the left is the only marker; no bullets, no icons. Paper ground keeps it
// distinct from the white metric cards without shouting.
export function InsightsCell({ cell }: Props) {
  const items = (cell.payload.items as string[]) ?? []
  if (!items.length) return null

  return (
    <div className="mb-2 border-l-2 border-violet bg-paper pl-4 pr-3 py-3 rounded-r-card">
      <ul className="space-y-2.5">
        {items.map((insight, i) => (
          <li key={i} dir="auto" className="text-[0.875rem] leading-[1.6] text-ink">
            {insight}
          </li>
        ))}
      </ul>
    </div>
  )
}
