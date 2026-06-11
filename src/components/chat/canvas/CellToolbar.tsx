"use client"

// CellToolbar — E10: hover toolbar for each cell (copy/SQL/expand/export)

import { useState } from "react"
import { Copy, Expand, Download, Check } from "lucide-react"
import { cn } from "@/lib/cn"
import type { AnswerCell } from "@/types"

interface Props {
  cell: AnswerCell
  messageId?: string
}

export function CellToolbar({ cell, messageId }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      const text = JSON.stringify(cell.payload, null, 2)
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  const handleExport = async () => {
    if (!messageId) return
    const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const url = `${BASE}/api/v1/query/history/${messageId}/cells/${cell.id}/csv`
    const a = document.createElement("a")
    a.href = url
    a.download = `${cell.name}.csv`
    a.click()
  }

  const canExport = (cell.kind === "table" || cell.kind === "chart") && Boolean(messageId)

  return (
    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1 z-10">
      <button
        onClick={handleCopy}
        className="flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
        title="Copy data"
      >
        {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      </button>
      {canExport && (
        <button
          onClick={handleExport}
          className="flex items-center justify-center h-6 w-6 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          title="Export CSV"
        >
          <Download size={12} />
        </button>
      )}
    </div>
  )
}
