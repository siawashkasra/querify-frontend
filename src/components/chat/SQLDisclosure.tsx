"use client"

import { useState, useCallback } from "react"
import { ChevronDown, Copy, Check } from "lucide-react"
import { cn } from "@/lib/cn"

interface SQLDisclosureProps {
  sql: string
}

const SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|AND|OR|NOT|IN|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|GROUP|BY|ORDER|ASC|DESC|LIMIT|OFFSET|HAVING|DISTINCT|UNION|ALL|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|WITH|CASE|WHEN|THEN|ELSE|END|COUNT|SUM|AVG|MIN|MAX|COALESCE|CAST|BETWEEN|LIKE|ILIKE|EXISTS|ANY|OVER|PARTITION|ROW_NUMBER|RANK|DENSE_RANK|LAG|LEAD|EXTRACT|INTERVAL|TRUE|FALSE)\b/gi
const SQL_STRINGS = /('[^']*')/g
const SQL_NUMBERS = /\b(\d+(?:\.\d+)?)\b/g

function highlightSQL(sql: string): React.ReactNode[] {
  const parts: { text: string; type: "keyword" | "string" | "number" | "plain"; start: number }[] = []
  const markers = new Set<number>()

  for (const match of sql.matchAll(SQL_STRINGS)) {
    const start = match.index!
    for (let i = start; i < start + match[0].length; i++) markers.add(i)
    parts.push({ text: match[0], type: "string", start })
  }

  for (const match of sql.matchAll(SQL_KEYWORDS)) {
    const start = match.index!
    if ([...Array(match[0].length)].some((_, j) => markers.has(start + j))) continue
    for (let i = start; i < start + match[0].length; i++) markers.add(i)
    parts.push({ text: match[0], type: "keyword", start })
  }

  for (const match of sql.matchAll(SQL_NUMBERS)) {
    const start = match.index!
    if ([...Array(match[0].length)].some((_, j) => markers.has(start + j))) continue
    for (let i = start; i < start + match[0].length; i++) markers.add(i)
    parts.push({ text: match[0], type: "number", start })
  }

  parts.sort((a, b) => a.start - b.start)

  const nodes: React.ReactNode[] = []
  let cursor = 0
  parts.forEach((p, i) => {
    if (p.start > cursor) nodes.push(sql.slice(cursor, p.start))
    const cls = p.type === "keyword" ? "text-brand font-semibold" : p.type === "string" ? "text-success" : "text-warning"
    nodes.push(<span key={i} className={cls}>{p.text}</span>)
    cursor = p.start + p.text.length
  })
  if (cursor < sql.length) nodes.push(sql.slice(cursor))
  return nodes
}

export const SQLDisclosure = ({ sql }: SQLDisclosureProps) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [sql])

  return (
    <div className="flex flex-col">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors py-1 select-none"
      >
        <ChevronDown size={12} className={cn("transition-transform", open && "rotate-180")} />
        SQL used
      </button>
      {open && (
        <div className="relative mt-1 rounded-lg bg-[#1e1b2e] border border-[var(--border)] overflow-hidden">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded text-[10px] text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 transition-colors"
          >
            {copied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy SQL</>}
          </button>
          <pre className="p-3 pr-24 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {highlightSQL(sql)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default SQLDisclosure
