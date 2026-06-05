"use client"

// Progressive analytical answer — written piece by piece as the §B depth
// engine's sub-queries complete (plan → primary chart → supporting findings →
// synthesized conclusion). §4 APPEND-ONLY: every section has a stable key and
// is upgraded IN PLACE; nothing already rendered is ever removed or redrawn —
// the component keeps rendering after `done`, so there is no swap/flicker.

import { useEffect, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/cn"
import { formatByField } from "@/lib/formatNumber"
import QueryChart from "./QueryChart"
import ResultCard from "./ResultCard"
import ResultFooter from "./ResultFooter"
import SQLDisclosure from "./SQLDisclosure"
import type { StreamFinding, StreamPlan } from "@/store/chatStore"
import type { QueryResult, ResponseBlock } from "@/types"

function toRowObjects(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r as Record<string, unknown>
    const arr = Array.isArray(r) ? r : []
    return Object.fromEntries(columns.map((col, i) => [col, arr[i] ?? null]))
  })
}

const EMPTY_RESULT: QueryResult = {
  message_id: "", status: "success", summary: null, sql: null, chart_config: null,
  kpi_cards: [], columns: [], rows: [], assumptions: [], error_type: null, message: null,
  suggestions: [], execution_ms: null, total_ms: null,
}

const ROLE_LABELS: Record<string, string> = {
  direct: "Answer",
  context: "Context",
  comparison: "Comparison",
  driver: "Driver",
  risk: "Trend & Risk",
}

// ── typing effect for the synthesized headline ───────────────────────────────
export function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!text) return
    // reveal the whole headline in <=1.2s regardless of length; all state
    // updates happen inside the interval tick, never synchronously in the effect
    const step = Math.max(1, Math.ceil(text.length / 80))
    const id = setInterval(() => {
      setShown((s) => {
        if (s >= text.length) { clearInterval(id); return s }
        return Math.min(s + step, text.length)
      })
    }, 15)
    return () => clearInterval(id)
  }, [text])

  return (
    <span className={className}>
      {text.slice(0, shown)}
      {shown < text.length && <span className="inline-block w-[2px] h-[1em] bg-brand align-middle animate-pulse ml-px" />}
    </span>
  )
}

// ── compact rendering of one finding's data ──────────────────────────────────
function FindingValue({ finding }: { finding: StreamFinding }) {
  if (finding.error) {
    return <p className="text-xs text-[var(--text-muted)] italic">Could not compute this one.</p>
  }
  const rows = (finding.rows ?? []) as unknown[][]
  if (!rows.length) {
    return <p className="text-xs text-[var(--text-muted)] italic">No data.</p>
  }
  // single value → big number
  if (rows.length === 1 && (rows[0] as unknown[]).length <= 2) {
    const row = rows[0] as unknown[]
    const valueIdx = row.length - 1
    const field = finding.columns[valueIdx]
    return (
      <p className="text-lg font-semibold font-mono text-[var(--text)]">
        {formatByField(row[valueIdx], field)}
      </p>
    )
  }
  // small table preview: first 3 rows
  return (
    <div className="flex flex-col gap-0.5">
      {rows.slice(0, 3).map((r, i) => {
        const arr = Array.isArray(r) ? r : [r]
        return (
          <p key={i} className="text-xs font-mono text-[var(--text-dim)] truncate">
            {arr.map((v, j) => formatByField(v, finding.columns[j])).join("  ·  ")}
          </p>
        )
      })}
      {rows.length > 3 && <p className="text-[10px] text-[var(--text-muted)]">+{rows.length - 3} more</p>}
    </div>
  )
}

// ── main component ───────────────────────────────────────────────────────────
interface StreamingAnalysisProps {
  plan?: StreamPlan
  findings?: StreamFinding[]
  partial?: Partial<QueryResult>
  stage?: string
  prompt?: string
  connectionName?: string
  result?: QueryResult          // the final answer — sections upgrade in place
  loading?: boolean
  onSuggestedQuestion?: (q: string) => void
}

export const StreamingAnalysis = ({ plan, findings = [], partial, stage, prompt, connectionName, result, loading = true, onSuggestedQuestion }: StreamingAnalysisProps) => {
  const done = !!result && !loading
  const doneIndexes = new Set(findings.map((f) => f.index))
  const supporting = [...findings].sort((a, b) => a.index - b.index).filter((f) => f.role !== "direct")
  const hasPrimary = !!partial && Array.isArray(partial.rows) && partial.rows.length > 0
  // synthesis content: the streamed partial stays once set (stable typewriter
  // text); the final result only ADDS what streaming didn't carry
  const headline = partial?.headline || result?.headline || ""
  const insights = (partial?.insights?.length ? partial.insights : result?.insights) ?? []
  const followUps = result?.follow_ups ?? partial?.follow_ups ?? []
  const finalBlocks = (result?.blocks ?? []) as ResponseBlock[]
  const synthesizing = !done && !!plan && doneIndexes.size >= (plan.sub_questions?.length ?? 0) && !headline

  return (
    <div data-testid="streaming-analysis" className="bg-white border border-[var(--border)] rounded-2xl shadow-sm px-7 py-6 flex flex-col gap-5">
      {/* 1 — the plan, ticked off as each sub-query lands */}
      {plan && (
        <div className="flex flex-col gap-1.5 animate-fade-slide-in">
          {plan.summary && <p className="text-xs leading-relaxed text-[var(--text-muted)]">{plan.summary}</p>}
          <ul className="flex flex-col gap-1">
            {plan.sub_questions.map((sq, i) => (
              <li key={i} className="flex items-center gap-2 text-xs animate-fade-slide-in" style={{ animationDelay: `${i * 80}ms` }}>
                {(done || doneIndexes.has(i))
                  ? <Check size={12} className="text-success shrink-0" />
                  : <Loader2 size={12} className="text-brand animate-spin shrink-0" />}
                <span className={cn("truncate", (done || doneIndexes.has(i)) ? "text-[var(--text-dim)]" : "text-[var(--text-muted)]")}>
                  {sq.question}
                </span>
                <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  {ROLE_LABELS[sq.role] ?? sq.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 2 — the core answer (chart/number), the moment the direct query returns */}
      {hasPrimary && (
        <div className="animate-fade-slide-in">
          <ResultCard result={{ ...EMPTY_RESULT, ...partial } as QueryResult} prompt={prompt} connectionName={connectionName} />
        </div>
      )}

      {/* 3 — supporting findings stream in as their queries complete; each
          renders its own shape-chosen chart (chart findings span full width) */}
      {supporting.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {supporting.map((f) => (
            <div
              key={f.index}
              className={cn(
                "animate-fade-slide-in flex flex-col gap-1 bg-[var(--surface-3)] border border-[var(--border)] rounded-lg px-3 py-2.5",
                f.chart_config && "sm:col-span-2",
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
                {ROLE_LABELS[f.role] ?? f.role}
              </span>
              <p className="text-xs text-[var(--text-dim)] leading-snug">{f.question}</p>
              {f.chart_config && f.rows.length > 1
                ? <QueryChart config={f.chart_config} rows={toRowObjects(f.columns, f.rows)} />
                : <FindingValue finding={f} />}
            </div>
          ))}
        </div>
      )}

      {/* 4 — the synthesized conclusion, written in last (upgrades in place) */}
      {headline && (
        <div key="synthesis" className="flex flex-col gap-2.5 animate-fade-slide-in border-t border-[var(--border)] pt-4">
          <p className="text-[15px] font-semibold text-[var(--text)] leading-[1.65]">
            <TypewriterText text={headline} />
          </p>
          {insights.map((ins, i) => (
            <p key={`ins-${i}`} className="text-sm text-[var(--text-dim)] leading-relaxed animate-fade-slide-in" style={{ animationDelay: `${300 + i * 200}ms` }}>
              {ins}
            </p>
          ))}
          {/* the why/implication prose + caveats APPEND once the final blocks land */}
          {finalBlocks.map((b, i) => {
            if (b.type === "narrative_block") {
              return (
                <div key={`nar-${b.heading ?? i}`} className="flex flex-col gap-1 animate-fade-slide-in">
                  {b.heading && <h4 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-1">{b.heading}</h4>}
                  {b.text.split("\n").filter(Boolean).map((line, j) => (
                    <p key={j} className="text-sm leading-[1.7] text-[var(--text-dim)]">{line}</p>
                  ))}
                </div>
              )
            }
            if (b.type === "caveat_block") {
              return (
                <div key="caveats" className="flex flex-col gap-1 animate-fade-slide-in">
                  {b.caveats.map((c, j) => (
                    <p key={j} className="text-[11px] text-[var(--text-muted)]">⚠ {c}</p>
                  ))}
                </div>
              )
            }
            return null
          })}
        </div>
      )}

      {/* 5 — follow-up chips + footer, appended when the answer completes */}
      {done && followUps.length > 0 && (
        <div key="followups" className="flex flex-wrap gap-2 animate-fade-slide-in">
          {followUps.slice(0, 3).map((q, i) => (
            <button key={i} onClick={() => onSuggestedQuestion?.(q)}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-1.5 text-xs text-[var(--text-dim)] transition-all hover:border-brand hover:text-brand">
              {q}
            </button>
          ))}
        </div>
      )}
      {done && result && (
        <div key="footer" className="flex flex-col gap-2 pt-1 animate-fade-slide-in">
          {result.sql && <SQLDisclosure sql={result.sql} />}
          <ResultFooter
            messageId={result.message_id}
            executionMs={result.execution_ms}
            totalMs={result.total_ms}
            modelUsed={result.model_used}
            initialFeedback={result.feedback_score}
            confidenceLevel={result.confidence_level ?? null}
            confidenceFactors={result.confidence_factors ?? []}
            confidenceCaveats={result.confidence_caveats ?? []}
          />
        </div>
      )}

      {/* live stage line — replaced IN PLACE by the synthesis above */}
      {!done && !headline && (
        <div key="stageline" className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
          {synthesizing ? "Synthesizing the answer…" : stage || "Analysing…"}
        </div>
      )}
    </div>
  )
}

export default StreamingAnalysis
