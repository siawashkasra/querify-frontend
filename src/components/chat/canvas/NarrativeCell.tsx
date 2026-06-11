"use client"

import type { AnswerCell } from "@/types"

// Bold numbers: $1.2M, -39.9%, 47k, plain integers/decimals.
// Numbers stay plain text; frontend bolds them with font-mono for clarity.
const NUMBER_RE = /(\$?-?[\d,]+\.?\d*[kKmMbB%]?%?|\d+\.\d+%?)/g

function BoldNumbers({ text }: { text: string }) {
  const parts = text.split(NUMBER_RE)
  return (
    <>
      {parts.map((part, i) =>
        NUMBER_RE.test(part) ? (
          <strong key={i} className="font-semibold font-mono text-gray-900 dark:text-gray-100">
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

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
    <div className="mb-4">
      {heading && (
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{heading}</p>
      )}
      {content.map((p, i) => (
        <p key={i} className="text-[14px] leading-[1.75] text-gray-700 dark:text-gray-300 mb-2 last:mb-0">
          <BoldNumbers text={p} />
        </p>
      ))}
    </div>
  )
}
