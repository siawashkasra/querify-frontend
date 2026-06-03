"use client"

import { useRef, useEffect, useState, KeyboardEvent } from "react"
import { ArrowUp, Database } from "lucide-react"
import { cn } from "@/lib/cn"

interface CentredPromptInputProps {
  onSubmit: (prompt: string) => void
  isLoading: boolean
  connectionName?: string
  dbType?: string
}

export function CentredPromptInput({ onSubmit, isLoading, connectionName, dbType }: CentredPromptInputProps) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const prompt = value.trim()
    if (!prompt || isLoading) return
    setValue("")
    onSubmit(prompt)
  }

  return (
    <div
      className={cn(
        "w-full rounded-2xl border-[1.5px] bg-white transition-all",
        "border-[var(--border-2)] focus-within:border-brand focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]"
      )}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder="Ask anything about your data..."
        className="w-full resize-none bg-transparent px-5 pt-4 pb-3 text-[15px] text-[var(--text)] placeholder-[var(--text-muted)] outline-none leading-relaxed disabled:opacity-50 block"
        style={{ maxHeight: 140 }}
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-[var(--text-muted)]" />
          {connectionName ? (
            <span className="text-xs text-[var(--text-dim)] font-medium">{connectionName}</span>
          ) : (
            <span className="text-xs text-[var(--text-muted)] italic">No connection selected</span>
          )}
          {dbType && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--surface-3)] text-[var(--text-muted)] font-mono uppercase border border-[var(--border)]">
              {dbType}
            </span>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-brand text-white disabled:opacity-40 hover:bg-brand-dark transition-colors"
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  )
}

export default CentredPromptInput
