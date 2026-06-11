"use client"

import { useMemo } from "react"
import type { AnswerCell, ChartConfig } from "@/types"
import { QueryChart } from "@/components/chat/QueryChart"

interface Props {
  cell: AnswerCell
}

export function ChartCell({ cell }: Props) {
  // Backend writes the chart config under `chart_config` (answer_assembly);
  // accept `config` too for forward-compat.
  const config = (cell.payload.chart_config ?? cell.payload.config) as ChartConfig | undefined

  const rows = useMemo<Record<string, unknown>[]>(() => {
    const columns = (cell.payload.columns as string[]) ?? []
    const rawRows = (cell.payload.rows as unknown[][]) ?? []
    if (!columns.length) return []
    return rawRows.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })
  }, [cell.payload])

  // Fewer than 2 data points — render a big number instead of a degenerate chart
  if (!config || rows.length < 2) {
    const firstRow = rows[0]
    const firstKey = firstRow ? Object.keys(firstRow).find((k) => typeof firstRow[k] === "number") : null
    const bigNum = firstKey ? firstRow[firstKey] : null
    if (bigNum != null) {
      const label = config?.title ?? cell.name?.replace(/_/g, " ")
      return (
        <div className="mb-4 flex flex-col items-start gap-1">
          {label && <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{label}</p>}
          <p className="text-4xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
            {typeof bigNum === "number" ? bigNum.toLocaleString() : String(bigNum)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="mb-4 h-[220px] sm:h-[280px]">
      <QueryChart config={{ ...config, data: null }} rows={rows} />
    </div>
  )
}
