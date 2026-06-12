"use client"

import { useMemo } from "react"
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { format as formatDate, parseISO, isValid } from "date-fns"
import { cn } from "@/lib/cn"
import { formatUnknownForUi } from "@/lib/formatDisplayValue"
import { labelize } from "@/lib/labelize"

interface DataTableProps {
  columns: string[]
  rows: Record<string, unknown>[]
}

type ColType = "number" | "date" | "boolean" | "text"

function detectType(colName: string, rows: Record<string, unknown>[]): ColType {
  const samples = rows.map((r) => r[colName]).filter((v) => v != null)
  if (samples.length === 0) return "text"
  if (samples.every((v) => typeof v === "boolean" || v === "true" || v === "false")) return "boolean"
  if (samples.every((v) => typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v))))) return "number"
  if (samples.every((v) => {
    if (typeof v !== "string") return false
    const d = parseISO(v)
    return isValid(d) && v.length >= 8
  })) return "date"
  return "text"
}

function formatCell(value: unknown, type: ColType): React.ReactNode {
  if (value == null) return <span className="text-ink-dim">—</span>
  switch (type) {
    case "number": {
      if (value != null && typeof value === "object") {
        const s = formatUnknownForUi(value)
        return s.length > 40 ? <span className="font-data tabular-nums" title={s}>{s.slice(0, 40)}…</span> : <span className="font-data tabular-nums">{s}</span>
      }
      const n = typeof value === "number" ? value : Number(value)
      if (Number.isNaN(n)) {
        const s = formatUnknownForUi(value)
        return s.length > 40 ? <span className="font-data tabular-nums" title={s}>{s.slice(0, 40)}…</span> : <span className="font-data tabular-nums">{s || "—"}</span>
      }
      return <span className="font-data tabular-nums">{n.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
    }
    case "date": {
      if (value != null && typeof value === "object") {
        const s = formatUnknownForUi(value)
        return s.length > 40 ? <span title={s}>{s.slice(0, 40)}…</span> : s
      }
      const d = parseISO(String(value))
      return isValid(d) ? formatDate(d, "MMM d, yyyy") : formatUnknownForUi(value)
    }
    case "boolean": {
      if (value != null && typeof value === "object") {
        const s = formatUnknownForUi(value)
        return s.length > 40 ? <span title={s}>{s.slice(0, 40)}…</span> : s
      }
      const b = value === true || value === "true"
      return (
        <span className={cn("inline-flex px-1.5 py-0.5 rounded-pill text-[10px] font-medium", b ? "bg-verify/12 text-verify" : "bg-line/60 text-ink-dim")}>
          {b ? "true" : "false"}
        </span>
      )
    }
    default: {
      const s = formatUnknownForUi(value)
      if (s.length > 40) {
        return <span title={s}>{s.slice(0, 40)}…</span>
      }
      return s
    }
  }
}

const columnHelper = createColumnHelper<Record<string, unknown>>()

export const DataTable = ({ columns, rows }: DataTableProps) => {
  const visibleCols = useMemo(() => columns.filter((col) => rows.some((r) => r[col] != null)), [columns, rows])
  const types = useMemo(() => Object.fromEntries(visibleCols.map((c) => [c, detectType(c, rows)])), [visibleCols, rows])

  const tableColumns = useMemo(
    () => visibleCols.map((col) =>
      columnHelper.accessor((row) => row[col], {
        id: col,
        header: labelize(col),
        cell: (info) => formatCell(info.getValue(), types[col]),
      })
    ),
    [visibleCols, types]
  )

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({ data: rows, columns: tableColumns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-3 h-10 text-[11px] font-medium uppercase tracking-wide text-ink-dim whitespace-nowrap select-none bg-paper border-b border-line",
                      types[header.id] === "number" ? "text-right" : "text-left"
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0 hover:bg-paper transition-colors">
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    dir={types[cell.column.id] === "number" ? undefined : "auto"}
                    className={cn(
                      "px-3 h-10 text-ink whitespace-nowrap",
                      types[cell.column.id] === "number" && "text-right font-data tabular-nums"
                    )}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length >= 5 && (
        <p className="text-[11px] text-ink-dim pl-1">Showing first {rows.length.toLocaleString()} rows</p>
      )}
    </div>
  )
}

export default DataTable
