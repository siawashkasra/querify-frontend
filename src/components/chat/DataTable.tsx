"use client"

import { useMemo } from "react"
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { format as formatDate, parseISO, isValid } from "date-fns"
import { cn } from "@/lib/cn"

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
  if (value == null) return <span className="text-[var(--text-muted)] italic">null</span>
  switch (type) {
    case "number": {
      const n = typeof value === "number" ? value : Number(value)
      return <span className="font-mono">{n.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
    }
    case "date": {
      const d = parseISO(String(value))
      return isValid(d) ? formatDate(d, "MMM d, yyyy") : String(value)
    }
    case "boolean": {
      const b = value === true || value === "true"
      return (
        <span className={cn("inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium", b ? "bg-success-bg text-success" : "bg-[var(--surface-3)] text-[var(--text-muted)]")}>
          {b ? "true" : "false"}
        </span>
      )
    }
    default: {
      const s = String(value)
      if (s.length > 40) {
        return <span title={s}>{s.slice(0, 40)}…</span>
      }
      return s
    }
  }
}

function humanize(col: string): string {
  return col
    .replace(/_id$/i, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim() || col
}

const columnHelper = createColumnHelper<Record<string, unknown>>()

export const DataTable = ({ columns, rows }: DataTableProps) => {
  const types = useMemo(() => Object.fromEntries(columns.map((c) => [c, detectType(c, rows)])), [columns, rows])

  const tableColumns = useMemo(
    () => columns.map((col) =>
      columnHelper.accessor((row) => row[col], {
        id: col,
        header: humanize(col),
        cell: (info) => formatCell(info.getValue(), types[col]),
      })
    ),
    [columns, types]
  )

  const table = useReactTable({ data: rows, columns: tableColumns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="flex flex-col gap-1">
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="w-full text-xs">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--border)] bg-[var(--surface)]">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      "px-3 py-2 font-medium text-[var(--text-dim)] whitespace-nowrap select-none",
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
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className={cn("border-b border-[var(--border)] last:border-0", i % 2 === 0 ? "bg-[var(--surface-2)]" : "bg-white")}>
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-3 py-1.5 text-[var(--text)] whitespace-nowrap",
                      types[cell.column.id] === "number" && "text-right font-mono"
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
        <p className="text-[10px] text-[var(--text-muted)] pl-1">Showing first {rows.length} rows</p>
      )}
    </div>
  )
}

export default DataTable
