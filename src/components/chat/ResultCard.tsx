"use client"

import { ChevronDown } from "lucide-react"
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

interface ResultCardProps {
  result: QueryResult
  onFollowUp?: () => void
}

export const ResultCard = ({ result, onFollowUp }: ResultCardProps) => {
  const [assumptionsOpen, setAssumptionsOpen] = useState(false)
  const hasKPIs = result.kpi_cards && result.kpi_cards.length > 0
  const hasTable = result.columns?.length > 0 && result.rows?.length > 0
  const hasAssumptions = result.assumptions && result.assumptions.length > 0
  const rowObjects = useMemo(() => hasTable ? toRowObjects(result.columns, result.rows) : [], [result.columns, result.rows, hasTable])

  return (
    <div data-testid="result-card" className="flex flex-col gap-3">
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
      />
    </div>
  )
}

export default ResultCard
