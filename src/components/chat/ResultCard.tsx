"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/cn"
import KPICards from "./KPICards"
import DataTable from "./DataTable"
import SQLDisclosure from "./SQLDisclosure"
import QueryChart from "./QueryChart"
import ResultFooter from "./ResultFooter"
import type { QueryResult } from "@/types"

// ── helpers ───────────────────────────────────────────────────────────────────

function toRowObjects(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r as Record<string, unknown>
    const arr = Array.isArray(r) ? r : []
    return Object.fromEntries(columns.map((col, i) => [col, arr[i] ?? null]))
  })
}

const NUMBER_RE = /(\$[\d,]+(?:\.\d+)?[KMBkmb]?|\d+(?:\.\d+)?%|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{3,}(?:\.\d+)?)/g

function boldNumbers(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(NUMBER_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index!))
    parts.push(
      <strong key={m.index} className="font-mono font-semibold text-brand">
        {m[0]}
      </strong>
    )
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function RichNarrative({ text, maxParagraphs = 4 }: { text: string; maxParagraphs?: number }) {
  const [expanded, setExpanded] = useState(false)
  const paragraphs = text.split(/\n\n+/).filter(Boolean)
  const shown = expanded ? paragraphs : paragraphs.slice(0, maxParagraphs)
  const hasMore = paragraphs.length > maxParagraphs

  return (
    <div className="flex flex-col gap-3">
      {shown.map((para, i) => {
        const lines = para.split("\n").filter(Boolean)
        const isList = lines.length > 1 && lines.every((l) => /^[-•*]\s/.test(l.trimStart()))
        if (isList) {
          return (
            <ul key={i} className="flex flex-col gap-1.5">
              {lines.map((line, j) => (
                <li key={j} className="flex items-start gap-2 text-sm leading-[1.7] text-[var(--text-dim)]">
                  <span className="mt-[7px] h-1 w-1 rounded-full bg-[var(--text-muted)] shrink-0" />
                  <span>{boldNumbers(line.replace(/^[-•*]\s*/, ""))}</span>
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="text-sm leading-[1.7] text-[var(--text-dim)]">
            {boldNumbers(para)}
          </p>
        )
      })}
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-brand transition-colors self-start"
        >
          <ChevronDown size={12} />
          Show more
        </button>
      )}
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface ResultCardProps {
  result: QueryResult
  prompt?: string
  connectionName?: string
  onFollowUp?: () => void
}

export const ResultCard = ({ result, connectionName, onFollowUp }: ResultCardProps) => {
  const [lowConfidenceDismissed, setLowConfidenceDismissed] = useState(false)
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)

  const hasKPIs = result.kpi_cards && result.kpi_cards.length > 0
  const hasTable = result.columns?.length > 0 && result.rows?.length > 0
  const hasAssumptions = result.assumptions && result.assumptions.length > 0
  const showLowConfidenceBanner = result.confidence_level === "low" && !lowConfidenceDismissed

  const rowObjects = useMemo(
    () => (hasTable ? toRowObjects(result.columns, result.rows) : []),
    [result.columns, result.rows, hasTable]
  )

  const rowCount = Array.isArray(result.rows) ? result.rows.length : 0
  const showMeta = rowCount > 0 || result.execution_ms || connectionName

  return (
    <div data-testid="result-card" className="flex flex-col gap-4">
      {showMeta && (
        <div className="flex items-center gap-2 flex-wrap">
          {rowCount > 0 && (
            <span className="text-xs text-[var(--text-muted)]">{rowCount} row{rowCount !== 1 ? "s" : ""}</span>
          )}
          {result.execution_ms && (
            <>
              {rowCount > 0 && <span className="text-[var(--text-muted)] text-xs">·</span>}
              <span className="text-xs text-[var(--text-muted)]">{result.execution_ms}ms</span>
            </>
          )}
          {connectionName && (
            <>
              {(rowCount > 0 || result.execution_ms) && <span className="text-[var(--text-muted)] text-xs">·</span>}
              <span className="text-[10px] font-mono text-[var(--text-muted)]">{connectionName}</span>
            </>
          )}
        </div>
      )}

      {/* low confidence banner */}
      {showLowConfidenceBanner && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="flex-1 text-xs text-[var(--text-dim)]">Low confidence — verify before making decisions.</p>
          <button onClick={() => setLowConfidenceDismissed(true)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
            <X size={13} />
          </button>
        </div>
      )}

      {/* B: KPI cards */}
      {hasKPIs && <KPICards cards={result.kpi_cards} />}

      {/* C: chart */}
      {result.chart_config && rowObjects.length >= 2 && (
        <QueryChart config={result.chart_config} rows={rowObjects} />
      )}

      {/* D: narrative */}
      {result.summary && (
        <div className="flex flex-col gap-2">
          <RichNarrative text={result.summary} />
          {hasAssumptions && (
            <div>
              <button
                onClick={() => setAssumptionsOpen((o) => !o)}
                className="flex items-center gap-1 text-xs text-warning hover:text-warning/80 transition-colors select-none"
              >
                <ChevronDown size={12} className={cn("transition-transform", assumptionsOpen && "rotate-180")} />
                Assumptions ({result.assumptions.length})
              </button>
              {assumptionsOpen && (
                <ul className="mt-1.5 flex flex-col gap-1 pl-4">
                  {result.assumptions.map((a, i) => (
                    <li key={i} className="text-xs italic text-warning/80 list-disc">The AI assumed {a}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* E: data table */}
      {hasTable && (
        <div className="flex flex-col gap-1">
          {rowCount >= 5 && (
            <p className="text-[10px] text-[var(--text-muted)]">Showing first {rowCount} rows of results</p>
          )}
          <DataTable columns={result.columns} rows={rowObjects} />
        </div>
      )}

      {/* F: footer */}
      <div className="flex flex-col gap-2 pt-1">
        {result.sql && <SQLDisclosure sql={result.sql} />}
        <ResultFooter
          messageId={result.message_id}
          executionMs={result.execution_ms}
          totalMs={result.total_ms}
          modelUsed={result.model_used}
          initialFeedback={result.feedback_score}
          onFollowUp={onFollowUp}
          confidenceLevel={result.confidence_level ?? null}
          confidenceFactors={result.confidence_factors ?? []}
          confidenceCaveats={result.confidence_caveats ?? []}
        />
      </div>
    </div>
  )
}

export default ResultCard
