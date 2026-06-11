"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
}

export function TitleCell({ cell }: Props) {
  const text = (cell.payload.text as string) ?? cell.name
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-snug">{text}</h2>
    </div>
  )
}
