"use client"

import type { AnswerCell, AnswerSection } from "@/types"
import { ChartCell } from "./ChartCell"
import { ComparisonCell } from "./ComparisonCell"
import { InsightsCell } from "./InsightsCell"
import { MetricsCell } from "./MetricsCell"
import { NarrativeCell } from "./NarrativeCell"
import { TableCell } from "./TableCell"
import { TitleCell } from "./TitleCell"

// ── Cell dispatcher ───────────────────────────────────────────────────────────

function CellRenderer({ cell }: { cell: AnswerCell }) {
  if (cell.status === "running") {
    return <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mb-4" />
  }
  switch (cell.kind) {
    case "title":      return <TitleCell cell={cell} />
    case "metrics":    return <MetricsCell cell={cell} />
    case "chart":      return <ChartCell cell={cell} />
    case "table":      return <TableCell cell={cell} />
    case "comparison": return <ComparisonCell cell={cell} />
    case "narrative":  return <NarrativeCell cell={cell} />
    case "insights":   return <InsightsCell cell={cell} />
    default:           return null
  }
}

// ── Section ───────────────────────────────────────────────────────────────────

function SectionView({ section }: { section: AnswerSection }) {
  const order = section.layout ?? section.cells.map((c) => c.id)
  const cellById = Object.fromEntries(section.cells.map((c) => [c.id, c]))
  const orderedCells = order.flatMap((id) => (cellById[id] ? [cellById[id]] : []))

  return (
    <section className="mb-8">
      {section.title && !orderedCells.some((c) => c.kind === "title") && (
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-snug">
          {section.title}
        </h2>
      )}
      {section.agent_notes?.map((note, i) => (
        <div
          key={i}
          className="flex gap-2 items-start bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-lg px-3 py-2 mb-3 text-sm text-blue-700 dark:text-blue-300"
        >
          <span className="flex-shrink-0 mt-0.5">ℹ</span>
          <span>{note.text}</span>
        </div>
      ))}
      {orderedCells.map((cell) => (
        <CellRenderer key={cell.id} cell={cell} />
      ))}
    </section>
  )
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface Props {
  sections: AnswerSection[]
  followUps?: string[]
  completionText?: string | null
  onFollowUp?: (q: string) => void
}

export function SessionCanvas({ sections, followUps, completionText, onFollowUp }: Props) {
  if (!sections.length) return null

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6">
      {sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}
      {completionText && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{completionText}</p>
      )}
      {followUps && followUps.length > 0 && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">Follow up</p>
          <div className="flex flex-wrap gap-2">
            {followUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onFollowUp?.(q)}
                className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
