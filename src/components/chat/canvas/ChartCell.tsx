"use client"

import { useMemo } from "react"
import type { AnswerCell, ChartConfig } from "@/types"
import { QueryChart } from "@/components/chat/QueryChart"

interface Props {
  cell: AnswerCell
}

export function ChartCell({ cell }: Props) {
  const config = cell.payload.config as ChartConfig | undefined
  const columns = (cell.payload.columns as string[]) ?? []
  const rawRows = (cell.payload.rows as unknown[][]) ?? []

  // Convert columnar [row[]] → Record<string, unknown>[] that QueryChart expects
  const rows = useMemo<Record<string, unknown>[]>(() => {
    if (!columns.length) return []
    return rawRows.map((row) => {
      const obj: Record<string, unknown> = {}
      columns.forEach((col, i) => { obj[col] = row[i] })
      return obj
    })
  }, [columns, rawRows])

  if (!config) return null

  return (
    <div className="mb-4">
      <QueryChart config={{ ...config, data: null }} rows={rows} />
    </div>
  )
}
