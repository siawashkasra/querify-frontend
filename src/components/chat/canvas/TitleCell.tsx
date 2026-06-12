"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
  sectionQuestion?: string
}

// U3 — section title in the display face. Tight tracking, ink on paper. The raw
// question is held back and revealed, quiet and italic, only on hover.
export function TitleCell({ cell, sectionQuestion }: Props) {
  const text = (cell.payload.text as string) ?? cell.name
  return (
    <div className="mb-2 group/title">
      <h2
        dir="auto"
        className="font-display text-[1.375rem] font-semibold tracking-[-0.01em] text-ink leading-snug"
      >
        {text}
      </h2>
      {sectionQuestion && (
        <p className="text-xs italic text-ink-dim mt-1.5 opacity-0 group-hover/title:opacity-100 transition-opacity duration-[var(--t-fast)] leading-snug">
          {sectionQuestion}
        </p>
      )}
    </div>
  )
}
