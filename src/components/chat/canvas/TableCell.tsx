"use client"

import { useState, useCallback, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table"
import { ChevronUp, ChevronDown, ChevronsUpDown, X, Plus } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import type { AnswerCell } from "@/types"
import { cn } from "@/lib/cn"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const PAGE_SIZE = 50

interface FilterState {
  col: string
  val: string
}

interface RowsResponse {
  columns: string[]
  rows: unknown[][]
  total_rows: number
  page: number
  page_size: number
}

function isNumeric(v: unknown): boolean {
  return typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)))
}

interface Props {
  cell: AnswerCell
  messageId?: string
}

export function TableCell({ cell, messageId }: Props) {
  const previewCols = (cell.payload.columns as string[]) ?? []
  const previewRows = (cell.payload.rows as unknown[][]) ?? []
  const totalFromPayload = (cell.payload.total_rows as number) ?? previewRows.length
  const totalCols = previewCols.length

  const [sorting, setSorting] = useState<SortingState>([])
  const [filter, setFilter] = useState<FilterState | null>(null)
  const [filterDraft, setFilterDraft] = useState<FilterState | null>(null)
  const [showFilterPopover, setShowFilterPopover] = useState(false)
  const [page, setPage] = useState(0)
  const [liveData, setLiveData] = useState<RowsResponse | null>(null)
  const [liveLoading, setLiveLoading] = useState(false)

  const hasEndpoint = Boolean(messageId && cell.id)
  const useLive = hasEndpoint && (sorting.length > 0 || filter !== null || page > 0)

  const fetchRows = useCallback(async () => {
    if (!hasEndpoint) return
    setLiveLoading(true)
    try {
      const token = useAuthStore.getState().accessToken
      const params = new URLSearchParams({ page: String(page + 1), page_size: String(PAGE_SIZE) })
      if (sorting.length > 0) {
        params.set("sort_by", sorting[0].id)
        params.set("sort_dir", sorting[0].desc ? "desc" : "asc")
      }
      if (filter) {
        params.set("filter_col", filter.col)
        params.set("filter_val", filter.val)
      }
      const resp = await fetch(
        `${BASE}/api/v1/query/history/${messageId}/cells/${cell.id}/rows?${params}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )
      if (resp.ok) {
        setLiveData(await resp.json())
      }
    } catch { /* silently fall back to preview */ }
    finally { setLiveLoading(false) }
  }, [messageId, cell.id, sorting, filter, page, hasEndpoint])

  useEffect(() => {
    if (useLive) fetchRows()
    else setLiveData(null)
  }, [useLive, fetchRows])

  const displayCols = liveData?.columns ?? previewCols
  const displayRows = liveData?.rows ?? previewRows
  const totalRows = liveData?.total_rows ?? totalFromPayload
  const currentPage = liveData?.page ?? page + 1
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const showingStart = (currentPage - 1) * PAGE_SIZE + 1
  const showingEnd = Math.min(currentPage * PAGE_SIZE, totalRows)

  // Build TanStack columns from displayCols
  const columns: ColumnDef<Record<string, unknown>>[] = displayCols.map((col) => ({
    id: col,
    accessorKey: col,
    header: col.replace(/_/g, " "),
    cell: ({ getValue }) => {
      const v = getValue()
      if (v == null) return <span className="text-gray-400">—</span>
      const s = String(v)
      const num = isNumeric(v)
      return <span className={cn(num && "font-mono tabular-nums text-right block")}>{s}</span>
    },
  }))

  // Convert rows (unknown[][]) to Record<string,unknown>[] for TanStack
  const tableData: Record<string, unknown>[] = displayRows.map((row) => {
    const obj: Record<string, unknown> = {}
    displayCols.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  })

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater)
      setPage(0)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: hasEndpoint ? getCoreRowModel() : getSortedRowModel(), // server sort when live
    manualSorting: hasEndpoint,
  })

  if (!displayCols.length) return null

  return (
    <div className="mb-4">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {hasEndpoint && (
          <div className="relative">
            <button
              onClick={() => { setFilterDraft(filter ?? { col: displayCols[0], val: "" }); setShowFilterPopover(true) }}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-600 transition-colors"
            >
              <Plus size={10} />
              Add Filter
            </button>
            {showFilterPopover && filterDraft && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-20 w-64">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filter rows</p>
                <select
                  value={filterDraft.col}
                  onChange={(e) => setFilterDraft({ ...filterDraft, col: e.target.value })}
                  className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 mb-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none"
                >
                  {displayCols.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
                <input
                  value={filterDraft.val}
                  onChange={(e) => setFilterDraft({ ...filterDraft, val: e.target.value })}
                  placeholder="contains…"
                  className="w-full text-xs border border-gray-200 dark:border-gray-700 rounded px-2 py-1 mb-2 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setFilter(filterDraft); setPage(0); setShowFilterPopover(false) }
                    if (e.key === "Escape") setShowFilterPopover(false)
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFilter(filterDraft); setPage(0); setShowFilterPopover(false) }}
                    className="flex-1 text-xs bg-violet-600 text-white rounded px-2 py-1 hover:bg-violet-700 transition-colors"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowFilterPopover(false)}
                    className="text-xs text-gray-500 px-2 py-1"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {filter && (
          <div className="flex items-center gap-1 text-xs bg-violet-50 dark:bg-violet-950 border border-violet-200 dark:border-violet-800 rounded-full px-2 py-0.5 text-violet-700 dark:text-violet-300">
            <span>{filter.col.replace(/_/g, " ")}: {filter.val}</span>
            <button onClick={() => { setFilter(null); setPage(0) }} className="hover:text-violet-900">
              <X size={10} />
            </button>
          </div>
        )}
        {sorting.length > 0 && (
          <div className="flex items-center gap-1 text-xs bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-full px-2 py-0.5 text-blue-700 dark:text-blue-300">
            <span>Sorted: {sorting[0].id.replace(/_/g, " ")} {sorting[0].desc ? "↓" : "↑"}</span>
            <button onClick={() => { setSorting([]); setPage(0) }} className="hover:text-blue-900">
              <X size={10} />
            </button>
          </div>
        )}
        {liveLoading && <span className="text-xs text-gray-400 animate-pulse">Loading…</span>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-gray-50 dark:bg-gray-800">
                {hg.headers.map((header, ci) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap select-none",
                        ci === 0 && "sticky left-0 z-10 bg-gray-50 dark:bg-gray-800"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                      style={{ cursor: "pointer" }}
                    >
                      <span className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? <ChevronUp size={10} /> : sorted === "desc" ? <ChevronDown size={10} /> : <ChevronsUpDown size={10} className="opacity-30" />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-900">
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={displayCols.length} className="px-3 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
                  No rows matched.
                  {filter && (
                    <button
                      onClick={() => { setFilter(null); setPage(0) }}
                      className="ml-2 text-violet-600 hover:underline"
                    >
                      Clear filter
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group/row hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {row.getVisibleCells().map((cell, ci) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap",
                        ci === 0 && "sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover/row:bg-gray-50 dark:group-hover/row:bg-gray-800/50"
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          Showing {showingStart}–{showingEnd} of {totalRows.toLocaleString()} rows ({totalCols} column{totalCols !== 1 ? "s" : ""})
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              ←
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              className="px-2 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              disabled={currentPage >= totalPages}
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
