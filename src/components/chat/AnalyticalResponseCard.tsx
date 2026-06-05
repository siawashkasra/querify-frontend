"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"
import SQLDisclosure from "./SQLDisclosure"
import KPICards from "./KPICards"
import QueryChart from "./QueryChart"
import ResultFooter from "./ResultFooter"
import type { QueryResult, AnalyticalSubQuery } from "@/types"

// ── helpers ─────────────────────────────────────────────────────────────────

function toRowObjects(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r as Record<string, unknown>
    const arr = Array.isArray(r) ? r : []
    return Object.fromEntries(columns.map((col, i) => [col, arr[i] ?? null]))
  })
}

function parseSections(markdown: string): Array<{ heading: string; content: string }> {
  const parts = markdown.split(/^## /m).filter(Boolean)
  return parts.map((part) => {
    const nl = part.indexOf("\n")
    const heading = nl === -1 ? part.trim() : part.slice(0, nl).trim()
    const content = nl === -1 ? "" : part.slice(nl + 1).trim()
    return { heading, content }
  })
}

function parseSuggestedQuestions(content: string): string[] {
  return content.split("\n").map((l) => l.replace(/^[-*]\s*/, "").trim()).filter(Boolean)
}

// ── section renderers ────────────────────────────────────────────────────────

function SummarySection({ content }: { content: string }) {
  return <p className="text-sm leading-[1.7] text-[var(--text-dim)]">{content}</p>
}

function KeyMetricsSection({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("-"))
  if (!lines.length) return <p className="text-sm text-[var(--text-dim)]">{content}</p>
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
      {lines.map((line, i) => {
        const text = line.replace(/^[-*]\s*/, "").trim()
        const boldMatch = text.match(/^\*\*(.+?)\*\*:?\s*(.*)$/)
        return (
          <li key={i} className="flex flex-col gap-0.5 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-2.5">
            {boldMatch ? (
              <>
                <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{boldMatch[1]}</span>
                <span className="text-sm font-mono text-[var(--text)]">{boldMatch[2]}</span>
              </>
            ) : (
              <span className="text-sm font-mono text-[var(--text)]">{text}</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function TrendSection({ content }: { content: string }) {
  return <p className="text-sm italic text-[var(--text-dim)] leading-relaxed">{content}</p>
}

function WatchSection({ content }: { content: string }) {
  return (
    <div className="border-l-2 border-warning pl-3 flex flex-col gap-1">
      {content.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} className="text-sm text-[var(--text-dim)] leading-relaxed">{line.replace(/^[-*]\s*/, "")}</p>
      ))}
    </div>
  )
}

function SuggestedQuestionsSection({ content, onSuggestedQuestion }: { content: string; onSuggestedQuestion?: (q: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {parseSuggestedQuestions(content).map((q, i) => (
        <button key={i} onClick={() => onSuggestedQuestion?.(q)} className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-3)] text-[var(--text-dim)] hover:border-brand hover:text-brand transition-colors text-left">
          {q}
        </button>
      ))}
    </div>
  )
}

function SubQueriesDisclosure({ subQueries }: { subQueries: AnalyticalSubQuery[] }) {
  const [open, setOpen] = useState(false)
  const withSQL = subQueries.filter((sq) => sq.sql)
  if (!withSQL.length) return null
  return (
    <div className="pt-3 border-t border-[var(--border)]">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors select-none">
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
        {withSQL.length} sub-{withSQL.length === 1 ? "query" : "queries"} run
      </button>
      {open && (
        <div className="mt-2 flex flex-col gap-3">
          {withSQL.map((sq, i) => (
            <div key={i} className="flex flex-col gap-1">
              <p className="text-xs text-[var(--text-muted)]">{i + 1}. {sq.question}</p>
              <SQLDisclosure sql={sq.sql!} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────

interface AnalyticalResponseCardProps {
  result: QueryResult
  prompt?: string
  connectionName?: string
  onSuggestedQuestion?: (question: string) => void
}

const KNOWN_SECTIONS = ["Summary", "Key Metrics", "Trend", "What to Watch", "Suggested Questions",
  "Answer", "Context & Comparison", "Why", "Implication"]

export const AnalyticalResponseCard = ({ result, onSuggestedQuestion }: AnalyticalResponseCardProps) => {
  const narrative = result.analytical_narrative || ""
  const sections = parseSections(narrative)
  const subQueries = result.analytical_sub_queries || []
  const hasKPIs = result.kpi_cards && result.kpi_cards.length > 0

  const rowObjects = useMemo(
    () => result.columns?.length && result.rows?.length ? toRowObjects(result.columns, result.rows) : [],
    [result.columns, result.rows]
  )

  return (
    <div className="flex flex-col gap-4">
      {hasKPIs && <KPICards cards={result.kpi_cards} />}

      {result.chart_config && rowObjects.length > 0 && (
        <QueryChart config={result.chart_config} rows={rowObjects} />
      )}

      {sections.map(({ heading, content }) => {
        if (!content) return null
        return (
          <div key={heading} className="flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{heading}</h4>
            {(heading === "Summary" || heading === "Answer") && <SummarySection content={content} />}
            {heading === "Key Metrics" && <KeyMetricsSection content={content} />}
            {(heading === "Trend" || heading === "Context & Comparison") && <TrendSection content={content} />}
            {(heading === "What to Watch" || heading === "Why" || heading === "Implication") && <WatchSection content={content} />}
            {heading === "Suggested Questions" && <SuggestedQuestionsSection content={content} onSuggestedQuestion={onSuggestedQuestion} />}
            {!KNOWN_SECTIONS.includes(heading) && <p className="text-sm text-[var(--text-dim)] leading-relaxed">{content}</p>}
          </div>
        )
      })}

      <SubQueriesDisclosure subQueries={subQueries} />

      <ResultFooter
        messageId={result.message_id}
        executionMs={result.execution_ms}
        totalMs={result.total_ms}
        modelUsed={result.model_used}
        initialFeedback={result.feedback_score}
        onFollowUp={onSuggestedQuestion ? () => onSuggestedQuestion("") : undefined}
        confidenceLevel={result.confidence_level ?? null}
        confidenceFactors={result.confidence_factors ?? []}
        confidenceCaveats={result.confidence_caveats ?? []}
      />
    </div>
  )
}

export default AnalyticalResponseCard
