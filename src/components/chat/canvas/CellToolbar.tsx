"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Copy, Download, Check, Expand, Code2, BarChart2, LineChart, AreaChart, PieChart, X } from "lucide-react"
import type { AnswerCell } from "@/types"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/cn"
import { ChartCell } from "./ChartCell"
import { TableCell } from "./TableCell"

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Compatible chart types by data shape
function compatibleTypes(cell: AnswerCell): { type: string; label: string; Icon: React.ElementType }[] {
  const rows = (cell.payload.rows as unknown[][]) ?? []
  const isSeries = rows.length > 6
  const all = [
    { type: "bar", label: "Bar", Icon: BarChart2 },
    { type: "line", label: "Line", Icon: LineChart },
    { type: "area", label: "Area", Icon: AreaChart },
    { type: "pie", label: "Pie", Icon: PieChart },
  ]
  if (isSeries) return all.filter((t) => t.type !== "pie")
  return all
}

// Generate markdown table from cell payload
function toMarkdown(cell: AnswerCell): string {
  if (cell.kind === "comparison") {
    const rows = (cell.payload.rows as { label: string; a: unknown; b: unknown; change_pct: unknown }[]) ?? []
    const aLabel = (cell.payload.a_label as string) ?? "A"
    const bLabel = (cell.payload.b_label as string) ?? "B"
    const header = `| Metric | ${aLabel} | ${bLabel} | Change |`
    const sep = `|--------|------|------|--------|`
    const body = rows.map((r) => `| ${r.label} | ${r.a} | ${r.b} | ${r.change_pct} |`).join("\n")
    return `${header}\n${sep}\n${body}`
  }
  if (cell.kind === "table") {
    const cols = (cell.payload.columns as string[]) ?? []
    const rows = (cell.payload.rows as unknown[][]) ?? []
    const header = `| ${cols.join(" | ")} |`
    const sep = `| ${cols.map(() => "------").join(" | ")} |`
    const body = rows.slice(0, 50).map((r) => `| ${(r as unknown[]).map(String).join(" | ")} |`).join("\n")
    return `${header}\n${sep}\n${body}`
  }
  return JSON.stringify(cell.payload, null, 2)
}

interface Props {
  cell: AnswerCell
  messageId?: string
  onRefine?: (prompt: string) => void
}

export function CellToolbar({ cell, messageId, onRefine }: Props) {
  const [copied, setCopied] = useState(false)
  const [showSQL, setShowSQL] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowSQL(false)
        setShowSwap(false)
      }
    }
    if (showSQL || showSwap) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showSQL, showSwap])

  // Close expanded modal on Esc
  useEffect(() => {
    if (!expanded) return
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false) }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [expanded])

  const handleCopy = useCallback(async () => {
    try {
      const text = ["comparison", "table"].includes(cell.kind)
        ? toMarkdown(cell)
        : JSON.stringify(cell.payload, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }, [cell])

  const handleExportCSV = useCallback(() => {
    if (!messageId) return
    const token = useAuthStore.getState().accessToken
    const url = `${BASE}/api/v1/query/history/${messageId}/cells/${cell.id}/csv`
    // Use fetch to attach auth header then trigger download
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a")
        a.href = URL.createObjectURL(blob)
        a.download = `${cell.name}.csv`
        a.click()
        URL.revokeObjectURL(a.href)
      })
      .catch(() => { /* ignore */ })
  }, [cell, messageId])

  const handleCopyPNG = useCallback(async () => {
    // Find chart node via data-chart-id attribute or nearest canvas
    const node = document.querySelector<HTMLElement>(`[data-cell-id="${cell.id}"] canvas`)?.parentElement
      ?? document.querySelector<HTMLElement>(`[data-cell-id="${cell.id}"]`)
    if (!node) return
    try {
      // Use html2canvas if available, otherwise skip
      const { default: html2canvas } = await import("html2canvas" as never) as { default: (el: HTMLElement) => Promise<HTMLCanvasElement> }
      const canvas = await html2canvas(node)
      canvas.toBlob((blob) => {
        if (!blob) return
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
          .catch(() => { /* clipboard write failed */ })
      })
    } catch { /* html2canvas not available */ }
  }, [cell.id])

  const handleSwapChart = useCallback((type: string) => {
    const prompt = `Change the ${cell.name} chart to a ${type} chart`
    onRefine?.(prompt)
    setShowSwap(false)
  }, [cell.name, onRefine])

  const sql = cell.payload.sql as string | null | undefined

  const isChart = cell.kind === "chart"
  const isTable = cell.kind === "table"
  const isComparison = cell.kind === "comparison"
  const canExport = (isTable || isChart) && Boolean(messageId)

  return (
    <>
      {/* Toolbar pill */}
      <div
        ref={toolbarRef}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-surface dark:bg-gray-900 border border-line dark:border-gray-700 rounded-lg shadow-rest p-1 z-10"
      >
        {/* Copy */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors"
          title={isTable || isComparison ? "Copy as markdown" : "Copy data"}
        >
          {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
        </button>

        {/* Chart: swap type */}
        {isChart && onRefine && (
          <div className="relative">
            <button
              onClick={() => { setShowSwap((o) => !o); setShowSQL(false) }}
              className="flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors"
              title="Swap chart type"
            >
              <BarChart2 size={11} />
            </button>
            {showSwap && (
              <div className="absolute top-full right-0 mt-1 bg-surface dark:bg-gray-900 border border-line dark:border-gray-700 rounded-lg shadow-float p-1 z-20 w-32">
                {compatibleTypes(cell).map(({ type, label, Icon }) => (
                  <button
                    key={type}
                    onClick={() => handleSwapChart(type)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-ink dark:text-gray-300 hover:bg-paper dark:hover:bg-gray-800 rounded transition-colors"
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SQL popover */}
        {sql && (
          <div className="relative">
            <button
              onClick={() => { setShowSQL((o) => !o); setShowSwap(false) }}
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors",
                showSQL && "bg-paper dark:bg-gray-800 text-ink dark:text-gray-200"
              )}
              title="View SQL"
            >
              <Code2 size={11} />
            </button>
            {showSQL && (
              <div className="absolute top-full right-0 mt-1 bg-surface dark:bg-gray-900 border border-line dark:border-gray-700 rounded-lg shadow-float p-3 z-20 w-80">
                <p className="text-[10px] font-medium text-ink-dim dark:text-ink-dim uppercase tracking-wide mb-2">SQL</p>
                <pre className="text-xs text-ink dark:text-gray-300 overflow-x-auto whitespace-pre-wrap font-data leading-relaxed">
                  {sql}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Expand */}
        {(isChart || isTable) && (
          <button
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors"
            title="Expand"
          >
            <Expand size={11} />
          </button>
        )}

        {/* Copy PNG (chart only) */}
        {isChart && (
          <button
            onClick={handleCopyPNG}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors"
            title="Copy as image"
          >
            <span className="text-[8px] font-medium">PNG</span>
          </button>
        )}

        {/* Export CSV */}
        {canExport && (
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center h-6 w-6 rounded hover:bg-paper dark:hover:bg-gray-800 text-ink-dim dark:text-ink-dim transition-colors"
            title="Export CSV"
          >
            <Download size={11} />
          </button>
        )}
      </div>

      {/* Fullscreen expand modal */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={(e) => { if (e.target === e.currentTarget) setExpanded(false) }}
        >
          <div className="bg-surface dark:bg-gray-900 rounded-2xl shadow-float w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-line dark:border-gray-800">
              <p className="text-sm font-semibold text-ink dark:text-gray-200">
                {cell.name?.replace(/_/g, " ")}
              </p>
              <button
                onClick={() => setExpanded(false)}
                className="text-ink-dim hover:text-ink dark:hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6" style={{ minHeight: 500 }}>
              {isChart && <div className="h-[500px]"><ChartCell cell={cell} /></div>}
              {isTable && <TableCell cell={cell} messageId={messageId} />}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
