"use client"

import { useState } from "react"
import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
}

const PAGE_SIZE = 50

export function TableCell({ cell }: Props) {
  const columns = (cell.payload.columns as string[]) ?? []
  const rows = (cell.payload.rows as unknown[][]) ?? []
  const total = (cell.payload.total as number) ?? rows.length
  const [page, setPage] = useState(0)

  if (!columns.length) return null

  const visible = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const pages = Math.ceil(rows.length / PAGE_SIZE)

  return (
    <div className="mb-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {visible.map((row, ri) => (
              <tr key={ri} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                {columns.map((_, ci) => (
                  <td key={ci} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {row[ci] == null ? "—" : String(row[ci])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>Showing {visible.length} of {total}</span>
        {pages > 1 && (
          <div className="flex gap-2">
            <button
              className="px-2 py-1 rounded border disabled:opacity-40"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span>{page + 1} / {pages}</span>
            <button
              className="px-2 py-1 rounded border disabled:opacity-40"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
