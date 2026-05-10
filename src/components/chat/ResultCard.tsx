"use client"

import { ChevronDown, ShieldCheck, ShieldAlert, Shield, CheckCircle2, AlertTriangle, X } from "lucide-react"
import { useMemo, useState } from "react"
import { cn } from "@/lib/cn"
import KPICards from "./KPICards"
import DataTable from "./DataTable"
import SQLDisclosure from "./SQLDisclosure"
import ResultFooter from "./ResultFooter"
import QueryChart from "./QueryChart"
import type { QueryResult } from "@/types"

function toRowObjects(columns: string[], rows: unknown[]): Record<string, unknown>[] {
  return rows.map((r) => {
    if (r && typeof r === "object" && !Array.isArray(r)) return r as Record<string, unknown>
    const arr = Array.isArray(r) ? r : []
    return Object.fromEntries(columns.map((col, i) => [col, arr[i] ?? null]))
  })
}

interface ConfidenceBadgeProps {
  level: "high" | "medium" | "low"
  factors: string[]
  caveats: string[]
}

function ConfidenceBadge({ level, factors, caveats }: ConfidenceBadgeProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false)

  const config = {
    high: { icon: ShieldCheck, label: "High confidence", color: "text-success", bg: "bg-success/10 border-success/20" },
    medium: { icon: ShieldAlert, label: "Medium confidence", color: "text-warning", bg: "bg-warning/10 border-warning/20" },
    low: { icon: Shield, label: "Low confidence", color: "text-[var(--text-muted)]", bg: "bg-[var(--surface)] border-[var(--border)]" },
  }[level]

  const Icon = config.icon

  return (
    <div className="relative">
      <button
        onClick={() => setTooltipOpen((o) => !o)}
        className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium transition-colors", config.bg, config.color)}
        title="Why this confidence level?"
      >
        <Icon size={11} />
        {config.label}
      </button>
      {tooltipOpen && (
        <div className="absolute bottom-7 right-0 z-20 w-72 rounded-xl border border-[var(--border)] bg-white shadow-xl p-3 text-xs">
          <p className="font-semibold text-[var(--text)] mb-2">Why this confidence level?</p>
          {factors.length > 0 && (
            <ul className="flex flex-col gap-1 mb-2">
              {factors.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5 text-success">
                  <CheckCircle2 size={11} className="mt-0.5 shrink-0" />
                  <span className="text-[var(--text)]">{f}</span>
                </li>
              ))}
            </ul>
          )}
          {caveats.length > 0 && (
            <ul className="flex flex-col gap-1">
              {caveats.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5 text-warning">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                  <span className="text-[var(--text-dim)]">{c}</span>
                </li>
              ))}
            </ul>
          )}
          {factors.length === 0 && caveats.length === 0 && (
            <p className="text-[var(--text-muted)]">No scoring detail available.</p>
          )}
        </div>
      )}
    </div>
  )
}

interface ResultCardProps {
  result: QueryResult
  onFollowUp?: () => void
}

export const ResultCard = ({ result, onFollowUp }: ResultCardProps) => {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const [lowConfidenceDismissed, setLowConfidenceDismissed] = useState(false)
  const hasKPIs = result.kpi_cards && result.kpi_cards.length > 0
  const hasTable = result.columns?.length > 0 && result.rows?.length > 0
  const hasAssumptions = result.assumptions && result.assumptions.length > 0
  const rowObjects = useMemo(() => hasTable ? toRowObjects(result.columns, result.rows) : [], [result.columns, result.rows, hasTable])
  const showLowConfidenceBanner = result.confidence_level === "low" && !lowConfidenceDismissed

  return (
    <div data-testid="result-card" className="flex flex-col gap-3">
      {showLowConfidenceBanner && (
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2.5">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warning" />
          <p className="flex-1 text-xs text-[var(--text-dim)]">
            This answer has low confidence. Verify before making decisions.
          </p>
          <button onClick={() => setLowConfidenceDismissed(true)} className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <X size={13} />
          </button>
        </div>
      )}

      {hasKPIs && <KPICards cards={result.kpi_cards} />}

      {result.summary && (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm leading-relaxed text-[var(--text)]">{result.summary}</p>
          {hasAssumptions && (
            <div>
              <button
                onClick={() => setAssumptionsOpen((o) => !o)}
                className="flex items-center gap-1 text-xs text-warning hover:text-warning/80 transition-colors select-none"
              >
                <ChevronDown size={12} className={cn("transition-transform", assumptionsOpen && "rotate-180")} />
                Assumptions made ({result.assumptions.length})
              </button>
              {assumptionsOpen && (
                <ul className="mt-1.5 flex flex-col gap-1 pl-4">
                  {result.assumptions.map((a, i) => (
                    <li key={i} className="text-xs italic text-warning/80 list-disc">
                      The AI assumed {a}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {result.chart_config && (
        <QueryChart config={result.chart_config} rows={rowObjects} />
      )}

      {hasTable && <DataTable columns={result.columns} rows={rowObjects} />}

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
  )
}

export default ResultCard
