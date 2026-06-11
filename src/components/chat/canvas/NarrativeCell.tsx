"use client"

import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
}

export function NarrativeCell({ cell }: Props) {
  const heading = cell.payload.heading as string | null | undefined
  const paragraphs = (cell.payload.paragraphs as string[]) ?? []
  const text = cell.payload.text as string | undefined

  const content = paragraphs.length > 0 ? paragraphs : text ? [text] : []
  if (!content.length) return null

  return (
    <div className="mb-4 prose prose-sm dark:prose-invert max-w-none">
      {heading && <p className="font-semibold text-gray-700 dark:text-gray-300 not-prose mb-1">{heading}</p>}
      {content.map((p, i) => (
        <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed">{p}</p>
      ))}
    </div>
  )
}
