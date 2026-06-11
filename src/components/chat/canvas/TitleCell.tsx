"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
  sectionQuestion?: string
}

export function TitleCell({ cell, sectionQuestion }: Props) {
  const text = (cell.payload.text as string) ?? cell.name
  return (
    <div className="mb-5 group/title">
      <h2 className="text-[22px] font-semibold text-gray-900 dark:text-gray-100 leading-snug tracking-tight">
        {text}
      </h2>
      {sectionQuestion && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 opacity-0 group-hover/title:opacity-100 transition-opacity duration-150 leading-snug">
          {sectionQuestion}
        </p>
      )}
    </div>
  )
}
