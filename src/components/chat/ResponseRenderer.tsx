"use client"

import { useMemo } from "react"
import { Lightbulb, Info, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/cn"
import QueryChart from "./QueryChart"
import SQLDisclosure from "./SQLDisclosure"
import ResultFooter from "./ResultFooter"
import { formatByField } from "@/lib/formatNumber"
import { formatUnknownForUi } from "@/lib/formatDisplayValue"
import type { AnalystKpiCard, ChartConfig, QueryResult, ResponseBlock } from "@/types"

// ── helpers ───────────────────────────────────────────────────────────────────
function toRowObjects(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r as Record<string, unknown>
    const arr = Array.isArray(r) ? r : []
    return Object.fromEntries(columns.map((col, i) => [col, arr[i] ?? null]))
  })
}

const NUMBER_RE = /(\$[\d,]+(?:\.\d+)?[KMBkmb]?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?[x×]|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{2,}(?:\.\d+)?)/g

function boldNumbers(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(NUMBER_RE)) {
    if (m.index! > last) parts.push(text.slice(last, m.index!))
    parts.push(<strong key={m.index} className="font-mono font-semibold text-[var(--text)]">{m[0]}</strong>)
    last = m.index! + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

// ── block components ────────────────────────────────────────────────────────────
function HeadlineBlock({ text, summary }: { text: string; summary?: string | null }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-lg font-semibold leading-snug text-[var(--text)]">{boldNumbers(text)}</p>
      {summary && <p className="text-sm leading-[1.7] text-[var(--text-dim)]">{boldNumbers(summary)}</p>}
    </div>
  )
}

function KpiRow({ cards }: { cards: AnalystKpiCard[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.slice(0, 4).map((card, i) => {
        const delta = card.delta
        const dir = delta == null ? "none" : delta > 0 ? "up" : delta < 0 ? "down" : "none"
        return (
          <div key={i} className="flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-white p-3">
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider truncate">{card.label}</span>
            <span className="text-2xl font-semibold font-mono text-brand leading-tight">
              {card.formatted ?? String(card.value)}
            </span>
            {delta != null && (
              <div className={cn("flex items-center gap-1 text-xs font-medium",
                dir === "up" && "text-success", dir === "down" && "text-danger", dir === "none" && "text-[var(--text-muted)]")}>
                {dir === "up" && <TrendingUp size={12} />}
                {dir === "down" && <TrendingDown size={12} />}
                <span>{delta > 0 ? "+" : ""}{delta}%</span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ChartBlock({ config, rows }: { config: ChartConfig; rows: Record<string, unknown>[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-4">
      <QueryChart config={config} rows={rows} />
    </div>
  )
}

// Signature Querify UX — a smart colleague pointing something out.
function InsightBlock({ insights }: { insights: string[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {insights.map((text, i) => (
        <div key={i} className="flex items-start gap-2.5 rounded-lg border-l-[3px] border-brand bg-brand/[0.06] px-3.5 py-3">
          <Lightbulb size={15} className="mt-0.5 shrink-0 text-brand" />
          <p className="text-sm leading-[1.6] text-[var(--text-dim)]">{boldNumbers(text)}</p>
        </div>
      ))}
    </div>
  )
}

function TableBlock({ columns, rows, ranked, percentColumn }: { columns: string[]; rows: unknown[][]; ranked?: boolean; percentColumn?: string | null }) {
  const pctIdx = percentColumn ? columns.indexOf(percentColumn) : -1
  const total = useMemo(() => {
    if (pctIdx < 0) return 0
    return rows.reduce((s, r) => s + (Number(r[pctIdx]) || 0), 0)
  }, [rows, pctIdx])

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
            {ranked && <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">#</th>}
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">{c.replace(/_/g, " ")}</th>
            ))}
            {pctIdx >= 0 && <th className="px-3 py-2 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">% of total</th>}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 100).map((row, ri) => (
            <tr key={ri} className={cn("border-b border-[var(--border)] last:border-0", ranked && ri === 0 && "bg-brand/[0.04]")}>
              {ranked && <td className="px-3 py-2 font-mono text-[var(--text-muted)]">{ri + 1}</td>}
              {columns.map((c, ci) => (
                <td key={c} className={cn("px-3 py-2 text-[var(--text-dim)]", ci === pctIdx && "font-mono")}>
                  {ci === pctIdx ? formatByField(row[ci], c) : (typeof row[ci] === "object" ? formatUnknownForUi(row[ci]) : String(row[ci] ?? "—"))}
                </td>
              ))}
              {pctIdx >= 0 && (
                <td className="px-3 py-2 text-right font-mono text-[var(--text-muted)]">
                  {total ? `${((Number(row[pctIdx]) || 0) / total * 100).toFixed(1)}%` : "—"}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CaveatBlock({ caveats }: { caveats: string[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      {caveats.map((c, i) => (
        <p key={i} className="flex items-start gap-1.5 text-xs text-[var(--text-muted)]">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>{c}</span>
        </p>
      ))}
    </div>
  )
}

function FollowupBlock({ questions, onSelect }: { questions: string[]; onSelect?: (q: string) => void }) {
  if (!questions.length) return null
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {questions.map((q, i) => (
        <button key={i} onClick={() => onSelect?.(q)}
          className="group flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-1.5 text-xs text-[var(--text-dim)] transition-all hover:border-brand hover:text-brand hover:-translate-y-0.5">
          <span>{q}</span>
          <ArrowUpRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      ))}
    </div>
  )
}

// ── renderer ──────────────────────────────────────────────────────────────────
interface ResponseRendererProps {
  result: QueryResult
  connectionName?: string
  onSuggestedQuestion?: (q: string) => void
  onFollowUp?: () => void
}

export const ResponseRenderer = ({ result, connectionName, onSuggestedQuestion, onFollowUp }: ResponseRendererProps) => {
  const rowObjects = useMemo(
    () => toRowObjects(result.columns ?? [], result.rows ?? []),
    [result.columns, result.rows],
  )
  const blocks = (result.blocks ?? []) as ResponseBlock[]
  const rowCount = Array.isArray(result.rows) ? result.rows.length : 0

  return (
    <div data-testid="response-renderer" className="flex flex-col gap-5">
      <div className="flex items-center gap-2 flex-wrap">
        {result.intent && <span className="text-[10px] uppercase tracking-wider font-medium text-brand rounded-full bg-brand/[0.08] px-2 py-0.5">{result.intent}</span>}
        {rowCount > 0 && <span className="text-xs text-[var(--text-muted)]">{rowCount} row{rowCount !== 1 ? "s" : ""}</span>}
        {result.execution_ms != null && <span className="text-xs text-[var(--text-muted)]">· {result.execution_ms}ms</span>}
        {connectionName && <span className="text-[10px] font-mono text-[var(--text-muted)]">· {connectionName}</span>}
      </div>

      {blocks.map((block, i) => {
        switch (block.type) {
          case "headline_block":
            return <HeadlineBlock key={i} text={block.text} summary={block.summary} />
          case "kpi_row":
            return <KpiRow key={i} cards={block.cards} />
          case "chart_block":
            return <ChartBlock key={i} config={block.config} rows={rowObjects} />
          case "insight_block":
            return <InsightBlock key={i} insights={block.insights} />
          case "table_block":
            return <TableBlock key={i} columns={block.columns} rows={block.rows as unknown[][]} ranked={block.ranked} percentColumn={block.percent_column} />
          case "caveat_block":
            return <CaveatBlock key={i} caveats={block.caveats} />
          case "followup_block":
            return <FollowupBlock key={i} questions={block.questions} onSelect={onSuggestedQuestion} />
          default:
            return null
        }
      })}

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

export default ResponseRenderer
