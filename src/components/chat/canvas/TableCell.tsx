"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from "@tanstack/react-table"
import { ChevronUp, ChevronDown, ChevronsUpDown, X, Plus, ArrowDownUp, ChevronLeft, ChevronRight, Download } from "lucide-react"
import { useAuthStore } from "@/store/authStore"
import type { AnswerCell } from "@/types"
import { cn } from "@/lib/cn"
import { formatByField } from "@/lib/formatNumber"
import { labelize } from "@/lib/labelize"

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

function toCsv(cols: string[], rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [cols.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n")
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

  // FIX 3c — during streaming the message id is a temp id (tmp_*) the rows
  // endpoint can't resolve; interactive controls stay disabled until the real
  // id is known. Preview rows render either way.
  const isRealMessageId = Boolean(messageId && !messageId.startsWith("tmp_"))
  const hasEndpoint = isRealMessageId && Boolean(cell.id)
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
  const showingStart = totalRows === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const showingEnd = Math.min(currentPage * PAGE_SIZE, totalRows)

  // Build TanStack columns — HUMANIZED headers via labelize() (snake_case and
  // raw table names are banned from headers).
  // TanStack re-derives its row model whenever `columns`/`data` change by
  // REFERENCE. Rebuilding these arrays every render fed it new references each
  // time, which on a prop/state change (e.g. switching sessions) drove it into a
  // re-render loop that pegged the main thread. Memoize so identity is stable.
  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => displayCols.map((col) => ({
    id: col,
    accessorKey: col,
    header: labelize(col),
    cell: ({ getValue }) => {
      const v = getValue()
      if (v == null || v === "") return <span className="text-ink-dim">—</span>
      const num = isNumeric(v)
      // numeric cells render formatted (currency/percent/compact aware), never a
      // raw float; the exact value lives in the title tooltip.
      const s = num ? formatByField(v, col) : String(v)
      return (
        <span
          dir={num ? undefined : "auto"}
          className={cn(num ? "font-data tabular-nums text-right block text-ink" : "text-ink")}
          title={num ? String(v) : undefined}
        >
          {s}
        </span>
      )
    },
  })), [displayCols])

  const tableData = useMemo<Record<string, unknown>[]>(() => displayRows.map((row) => {
    const obj: Record<string, unknown> = {}
    displayCols.forEach((col, i) => { obj[col] = (row as unknown[])[i] })
    return obj
  }), [displayCols, displayRows])

  const numericCols = useMemo(() => {
    const out = new Set<string>()
    displayCols.forEach((col, i) => {
      if (displayRows.some((r) => isNumeric((r as unknown[])[i]))) out.add(col)
    })
    return out
  }, [displayCols, displayRows])

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
  // TASK 3 — a single scalar never reaches TableCell (MetricsCell owns it).
  if (displayCols.length === 1 && displayRows.length <= 1) return null

  const ghostBtn =
    "inline-flex items-center gap-1 text-xs px-2 py-1 rounded-ctrl text-ink-dim hover:bg-violet-soft hover:text-violet transition-colors"

  const handleExport = () => {
    const csv = toCsv(displayCols, displayRows as unknown[][])
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${labelize(cell.name) || "table"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mb-2">
      {/* Interaction chrome — ghost-weight until needed */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        {hasEndpoint && (
          <div className="relative">
            <button
              onClick={() => { setFilterDraft(filter ?? { col: displayCols[0], val: "" }); setShowFilterPopover(true) }}
              className={ghostBtn}
            >
              <Plus size={12} />
              Add filter
            </button>
            {showFilterPopover && filterDraft && (
              <div className="absolute top-full left-0 mt-1 bg-surface border border-line rounded-card shadow-float p-3 z-20 w-64">
                <p className="text-xs font-medium text-ink mb-2">Filter rows</p>
                <select
                  value={filterDraft.col}
                  onChange={(e) => setFilterDraft({ ...filterDraft, col: e.target.value })}
                  className="w-full text-xs border border-line rounded-ctrl px-2 py-1.5 mb-2 bg-surface text-ink outline-none focus:border-violet"
                >
                  {displayCols.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}
                </select>
                <input
                  value={filterDraft.val}
                  onChange={(e) => setFilterDraft({ ...filterDraft, val: e.target.value })}
                  placeholder="contains…"
                  className="w-full text-xs border border-line rounded-ctrl px-2 py-1.5 mb-2 bg-surface text-ink placeholder:text-ink-dim/70 outline-none focus:border-violet"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setFilter(filterDraft); setPage(0); setShowFilterPopover(false) }
                    if (e.key === "Escape") setShowFilterPopover(false)
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setFilter(filterDraft); setPage(0); setShowFilterPopover(false) }}
                    className="flex-1 text-xs bg-violet text-white rounded-ctrl px-2 py-1.5 hover:brightness-[0.94] transition-[filter]"
                  >
                    Apply
                  </button>
                  <button onClick={() => setShowFilterPopover(false)} className="text-xs text-ink-dim px-2 py-1.5">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {/* active filter chip (U2 selected style) */}
        {filter && (
          <span className="inline-flex items-center gap-1 text-xs rounded-pill bg-violet-soft text-violet px-2.5 py-0.5">
            <span>{labelize(filter.col)}: {filter.val}</span>
            <button onClick={() => { setFilter(null); setPage(0) }} className="hover:opacity-70"><X size={11} /></button>
          </span>
        )}
        {/* active sort chip */}
        {sorting.length > 0 && (
          <span className="inline-flex items-center gap-1 text-xs rounded-pill bg-violet-soft text-violet px-2.5 py-0.5">
            <ArrowDownUp size={11} />
            <span>{labelize(sorting[0].id)} {sorting[0].desc ? "↓" : "↑"}</span>
            <button onClick={() => { setSorting([]); setPage(0) }} className="hover:opacity-70"><X size={11} /></button>
          </span>
        )}
        {liveLoading && <span className="text-xs text-ink-dim animate-pulse">Loading…</span>}
      </div>

      {/* Table — a card; the table reads as content, not a widget */}
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="min-w-full text-[13px] border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header, ci) => {
                  const sorted = header.column.getIsSorted()
                  const isNum = numericCols.has(header.column.id)
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 h-10 text-[11px] font-medium uppercase tracking-wide text-ink-dim whitespace-nowrap select-none cursor-pointer bg-paper sticky top-0 z-10 border-b border-line",
                        isNum ? "text-right" : "text-left",
                        ci === 0 && "left-0 z-20"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <span className={cn("flex items-center gap-1", isNum && "justify-end")}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sorted === "asc" ? <ChevronUp size={10} /> : sorted === "desc" ? <ChevronDown size={10} /> : <ChevronsUpDown size={10} className="opacity-30" />}
                      </span>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableData.length === 0 ? (
              <tr>
                <td colSpan={displayCols.length} className="px-3 py-8 text-center text-sm text-ink-dim">
                  No rows matched.
                  {filter && (
                    <button onClick={() => { setFilter(null); setPage(0) }} className="ml-2 text-ink-dim hover:text-violet underline">
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group/row hover:bg-paper transition-colors border-b border-line last:border-0">
                  {row.getVisibleCells().map((cell, ci) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-3 h-10 whitespace-nowrap",
                        ci === 0 && "sticky left-0 z-10 bg-surface group-hover/row:bg-paper"
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

      {/* Footer — Showing X–Y of Z rows · N columns */}
      <div className="flex items-center justify-between mt-2 text-xs text-ink-dim">
        <div className="flex items-center gap-3">
          <span>
            Showing {showingStart.toLocaleString()}–{showingEnd.toLocaleString()} of {totalRows.toLocaleString()} row{totalRows !== 1 ? "s" : ""} · {totalCols} column{totalCols !== 1 ? "s" : ""}
          </span>
          {displayRows.length > 0 && (
            <button onClick={handleExport} className="inline-flex items-center gap-1 hover:text-violet transition-colors">
              <Download size={11} /> Export CSV
            </button>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              className="p-1 rounded-ctrl text-ink-dim disabled:opacity-40 hover:bg-paper transition-colors"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-data tabular-nums">{currentPage} / {totalPages}</span>
            <button
              className="p-1 rounded-ctrl text-ink-dim disabled:opacity-40 hover:bg-paper transition-colors"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
