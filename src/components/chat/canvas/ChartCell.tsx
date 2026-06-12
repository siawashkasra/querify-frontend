"use client"

import { useMemo } from "react"
import type { AnswerCell, ChartConfig } from "@/types"
import { QueryChart } from "@/components/chat/QueryChart"
import { numClass } from "@/lib/numTrust"
import { formatByField } from "@/lib/formatNumber"

interface Props {
  cell: AnswerCell
}

// U4 — ChartCell. Title 13px medium ink; chart 280px (220 mobile). Empty or
// single-point data never renders a degenerate chart — it falls back to the big
// number wearing the trust underline.
export function ChartCell({ cell }: Props) {
  const config = (cell.payload.chart_config ?? cell.payload.config) as ChartConfig | undefined
  const trust = numClass(cell.payload.routing_path as string | undefined)

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

  // Fewer than 2 data points — the big-number fallback, never a degenerate chart.
  if (!config || rows.length < 2) {
    const firstRow = rows[0]
    const firstKey = firstRow ? Object.keys(firstRow).find((k) => typeof firstRow[k] === "number") : null
    const bigNum = firstKey ? firstRow[firstKey] : null
    if (bigNum != null) {
      const label = config?.title ?? cell.name?.replace(/_/g, " ")
      return (
        <div className="flex flex-col items-start gap-1.5">
          {label && <p className="text-[11px] uppercase tracking-wide text-ink-dim">{label}</p>}
          <p className={`text-[2.25rem] leading-none font-medium text-ink ${trust}`}>
            {firstKey ? formatByField(bigNum, firstKey) : String(bigNum)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      {config.title && (
        <p className="text-[13px] font-medium text-ink">{config.title.replace(/_/g, " ")}</p>
      )}
      <div className="h-[220px] sm:h-[280px]">
        <QueryChart config={{ ...config, title: undefined, data: null }} rows={rows} />
      </div>
    </div>
  )
}
