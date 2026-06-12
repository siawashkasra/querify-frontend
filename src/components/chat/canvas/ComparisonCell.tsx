"use client"

import type { AnswerCell } from "@/types"
import { DeltaChip } from "./DeltaChip"

interface ComparisonRow {
  label: string
  a: string
  b: string
  change_pct: number | null
  good_direction?: "up" | "down" | null
}

interface Props {
  cell: AnswerCell
}

// U3 — borderless comparison table. Label column is quiet ink-dim; value columns
// are mono and right-aligned so periods line up digit-for-digit; the change
// column is delta chips (tone by good_direction). Header is an uppercase eyebrow.
export function ComparisonCell({ cell }: Props) {
  const rows = (cell.payload.rows as ComparisonRow[]) ?? []
  const aLabel = (cell.payload.a_label as string) ?? "Period A"
  const bLabel = (cell.payload.b_label as string) ?? "Period B"

  if (!rows.length) return null

  const head = "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-dim"
  const val = "px-3 py-2.5 text-right font-data tabular-nums text-ink"

  return (
    <div className="mb-2 overflow-x-auto">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-line">
            <th className={head + " text-left"}>Metric</th>
            <th className={head + " text-right"}>{aLabel}</th>
            <th className={head + " text-right"}>{bLabel}</th>
            <th className={head + " text-right"}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-line/60">
              <td dir="auto" className="px-3 py-2.5 text-ink-dim">{row.label}</td>
              <td className={val}>{row.a}</td>
              <td className={val}>{row.b}</td>
              <td className="px-3 py-2.5 text-right">
                {row.change_pct == null ? (
                  <span className="text-ink-dim">—</span>
                ) : (
                  <DeltaChip delta={row.change_pct} goodDirection={row.good_direction} className="ml-auto" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
