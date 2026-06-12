"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Components } from "react-markdown"
import type { AnswerCell } from "@/types"

// FIX 3 — narrative cells render real markdown (## subheads, **bold**, lists as
// proper <ul>/<ol>), and every text block gets dir="auto" so Persian / Arabic /
// Hebrew names lay out RTL. No raw '##' ever reaches the DOM.
const MD_COMPONENTS: Components = {
  h1: ({ children }) => <p dir="auto" className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1.5 first:mt-0">{children}</p>,
  h2: ({ children }) => <p dir="auto" className="text-sm font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1.5 first:mt-0">{children}</p>,
  h3: ({ children }) => <p dir="auto" className="text-[13px] font-semibold text-gray-700 dark:text-gray-300 mt-2 mb-1">{children}</p>,
  p: ({ children }) => <p dir="auto" className="text-[14px] leading-[1.75] text-gray-700 dark:text-gray-300 mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul dir="auto" className="list-disc pl-5 mb-2 space-y-1 text-[14px] leading-[1.7] text-gray-700 dark:text-gray-300">{children}</ul>,
  ol: ({ children }) => <ol dir="auto" className="list-decimal pl-5 mb-2 space-y-1 text-[14px] leading-[1.7] text-gray-700 dark:text-gray-300">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6]">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-gray-100">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} className="text-violet-600 hover:underline" target="_blank" rel="noreferrer">{children}</a>,
  code: ({ children }) => <code className="font-mono text-[13px] bg-gray-100 dark:bg-gray-800 rounded px-1 py-0.5">{children}</code>,
}

interface Props {
  cell: AnswerCell
}

export function NarrativeCell({ cell }: Props) {
  const heading = cell.payload.heading as string | null | undefined
  const paragraphs = (cell.payload.paragraphs as string[]) ?? []
  const text = cell.payload.text as string | undefined

  // FIX 1 — identical consecutive paragraphs must never render twice.
  const src = paragraphs.length > 0 ? paragraphs : text ? [text] : []
  const deduped = src.filter((p, i) => i === 0 || p.trim() !== src[i - 1].trim())
  // Join into one markdown document so lists/sections render coherently.
  const content = deduped.join("\n\n").trim()
  if (!content && !heading) return null

  return (
    <div className="mb-4">
      {heading && (
        <p dir="auto" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{heading}</p>
      )}
      {content && (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
          {content}
        </ReactMarkdown>
      )}
    </div>
  )
}
