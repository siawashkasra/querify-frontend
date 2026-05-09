"use client"

import { useState } from "react"
import { ChevronDown, BarChart2 } from "lucide-react"
import { cn } from "@/lib/cn"
import SQLDisclosure from "./SQLDisclosure"
import type { QueryResult, AnalyticalSubQuery } from "@/types"

interface AnalyticalResponseCardProps {
  result: QueryResult
  onSuggestedQuestion?: (question: string) => void
}

function parseSections(markdown: string): Array<{ heading: string; content: string }> {
  const parts = markdown.split(/^## /m).filter(Boolean)
  return parts.map((part) => {
    const newline = part.indexOf("\n")
    const heading = newline === -1 ? part.trim() : part.slice(0, newline).trim()
    const content = newline === -1 ? "" : part.slice(newline + 1).trim()
    return { heading, content }
  })
}

function parseSuggestedQuestions(content: string): string[] {
  return content
    .split("\n")
    .map((l) => l.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
}

function SummarySection({ content }: { content: string }) {
  return (
    <div className="mb-4">
      <p className="text-base font-medium text-[var(--text)] leading-relaxed">{content}</p>
    </div>
  )
}

function KeyMetricsSection({ content }: { content: string }) {
  const lines = content.split("\n").filter((l) => l.trim().startsWith("-"))
  if (!lines.length) return <p className="text-sm text-[var(--text-dim)]">{content}</p>
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
      {lines.map((line, i) => {
        const text = line.replace(/^[-*]\s*/, "").trim()
        const boldMatch = text.match(/^\*\*(.+?)\*\*:?\s*(.*)$/)
        const label = boldMatch ? boldMatch[1] : null
        const value = boldMatch ? boldMatch[2] : text
        return (
          <li key={i} className="flex flex-col gap-0.5 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-2.5">
            {label && <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</span>}
            <span className="text-sm font-mono text-[var(--text)]">{value}</span>
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
  const lines = content.split("\n").filter(Boolean)
  return (
    <div className="border-l-2 border-amber-400 pl-3 flex flex-col gap-1">
      {lines.map((line, i) => (
        <p key={i} className="text-sm text-[var(--text-dim)] leading-relaxed">{line.replace(/^[-*]\s*/, "")}</p>
      ))}
    </div>
  )
}

function SuggestedQuestionsSection({ content, onSuggestedQuestion }: { content: string; onSuggestedQuestion?: (q: string) => void }) {
  const questions = parseSuggestedQuestions(content)
  return (
    <div className="flex flex-wrap gap-2">
      {questions.map((q, i) => (
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
    <div className="mt-3 pt-3 border-t border-[var(--border)]">
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

export const AnalyticalResponseCard = ({ result, onSuggestedQuestion }: AnalyticalResponseCardProps) => {
  const narrative = result.analytical_narrative || ""
  const sections = parseSections(narrative)
  const subQueries = result.analytical_sub_queries || []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BarChart2 size={13} className="text-purple-400 shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-400">Analysis</span>
      </div>

      {sections.map(({ heading, content }) => {
        if (!content) return null
        return (
          <div key={heading} className="flex flex-col gap-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{heading}</h4>
            {heading === "Summary" && <SummarySection content={content} />}
            {heading === "Key Metrics" && <KeyMetricsSection content={content} />}
            {heading === "Trend" && <TrendSection content={content} />}
            {heading === "What to Watch" && <WatchSection content={content} />}
            {heading === "Suggested Questions" && <SuggestedQuestionsSection content={content} onSuggestedQuestion={onSuggestedQuestion} />}
            {!["Summary", "Key Metrics", "Trend", "What to Watch", "Suggested Questions"].includes(heading) && (
              <p className="text-sm text-[var(--text-dim)] leading-relaxed">{content}</p>
            )}
          </div>
        )
      })}

      <SubQueriesDisclosure subQueries={subQueries} />
    </div>
  )
}

export default AnalyticalResponseCard
