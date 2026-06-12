"use client"

import { Fragment, type ReactNode } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { AnswerCell } from "@/types"

// U3 — inline numbers get the mono treatment automatically. Any numeric token in
// narrative prose is wrapped in .num-plain (mono + tabular, no underline) so the
// figures line up with the cards without the author marking them up by hand.
const NUM_RE = /(\$?\d[\d,]*\.?\d*\s?(?:%|[KMB])?)/g

function decorateNumbers(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    const parts = children.split(NUM_RE)
    if (parts.length === 1) return children
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <span key={i} className="num-plain">{part}</span>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      )
    )
  }
  if (Array.isArray(children)) {
    return children.map((c, i) => <Fragment key={i}>{decorateNumbers(c)}</Fragment>)
  }
  return children
}

// FIX 3 (carried) — real markdown; every block gets dir="auto" so RTL names lay
// out correctly. Headings become quiet uppercase eyebrows. Bold stays ink — no
// color. Violet never appears in assistant prose.
const MD_COMPONENTS: Components = {
  h1: ({ children }) => <p dir="auto" className="text-[13px] font-semibold uppercase tracking-wide text-ink-dim mt-4 mb-1.5 first:mt-0">{decorateNumbers(children)}</p>,
  h2: ({ children }) => <p dir="auto" className="text-[13px] font-semibold uppercase tracking-wide text-ink-dim mt-4 mb-1.5 first:mt-0">{decorateNumbers(children)}</p>,
  h3: ({ children }) => <p dir="auto" className="text-[13px] font-semibold uppercase tracking-wide text-ink-dim mt-3 mb-1">{decorateNumbers(children)}</p>,
  p: ({ children }) => <p dir="auto" className="text-[0.9375rem] leading-[1.7] text-ink mb-2.5 last:mb-0">{decorateNumbers(children)}</p>,
  ul: ({ children }) => <ul dir="auto" className="list-disc pl-5 mb-2.5 space-y-2 text-[0.9375rem] leading-[1.7] text-ink">{children}</ul>,
  ol: ({ children }) => <ol dir="auto" className="list-decimal pl-5 mb-2.5 space-y-2 text-[0.9375rem] leading-[1.7] text-ink">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{decorateNumbers(children)}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{decorateNumbers(children)}</strong>,
  em: ({ children }) => <em className="italic">{decorateNumbers(children)}</em>,
  a: ({ children, href }) => <a href={href} className="text-violet hover:underline" target="_blank" rel="noreferrer">{children}</a>,
  code: ({ children }) => <code className="font-data text-[13px] bg-paper border border-line rounded px-1 py-0.5">{children}</code>,
}

interface Props {
  cell: AnswerCell
}

export function NarrativeCell({ cell }: Props) {
  const heading = cell.payload.heading as string | null | undefined
  const paragraphs = (cell.payload.paragraphs as string[]) ?? []
  const text = cell.payload.text as string | undefined

  // FIX 1 (carried) — identical consecutive paragraphs must never render twice.
  const src = paragraphs.length > 0 ? paragraphs : text ? [text] : []
  const deduped = src.filter((p, i) => i === 0 || p.trim() !== src[i - 1].trim())
  const content = deduped.join("\n\n").trim()
  if (!content && !heading) return null

  return (
    <div className="mb-2 max-w-[65ch]">
      {heading && (
        <p dir="auto" className="text-[13px] font-semibold uppercase tracking-wide text-ink-dim mb-1.5">{heading}</p>
      )}
      {content && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  )
}
