"use client"

import type { AnswerCell } from "@/types"

interface ComparisonRow {
  label: string
  a: string
  b: string
  change_pct: number | null
}

interface Props {
  cell: AnswerCell
}

export function ComparisonCell({ cell }: Props) {
  const rows = (cell.payload.rows as ComparisonRow[]) ?? []
  const aLabel = (cell.payload.a_label as string) ?? "Period A"
  const bLabel = (cell.payload.b_label as string) ?? "Period B"

  if (!rows.length) return null

  return (
    <div className="mb-4 overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metric</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{aLabel}</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{bLabel}</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
          {rows.map((row, i) => {
            const pct = row.change_pct
            const isPos = pct != null && pct > 0
            const isNeg = pct != null && pct < 0
            return (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{row.label}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{row.a}</td>
                <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{row.b}</td>
                <td className={`px-4 py-2 text-right font-medium ${isPos ? "text-green-600" : isNeg ? "text-red-600" : "text-gray-500"}`}>
                  {pct == null
                    ? "—"
                    : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
