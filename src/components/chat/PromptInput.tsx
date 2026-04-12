"use client"

import { useRef, useEffect, useState, useImperativeHandle, forwardRef, KeyboardEvent } from "react"
import { ArrowUp, Square } from "lucide-react"
import { cn } from "@/lib/cn"

export interface PromptInputHandle {
  focus: () => void
}

interface PromptInputProps {
  onSubmit: (prompt: string) => void
  onCancel: () => void
  loading: boolean
  disabled?: boolean
}

export const PromptInput = forwardRef<PromptInputHandle, PromptInputProps>(({ onSubmit, onCancel, loading, disabled }, fwdRef) => {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  useImperativeHandle(fwdRef, () => ({ focus: () => ref.current?.focus() }), [])

  useEffect(() => {
    if (!loading) ref.current?.focus()
  }, [loading])

  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [value])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const prompt = value.trim()
    if (!prompt || loading || disabled) return
    setValue("")
    onSubmit(prompt)
  }

  return (
    <div className="px-4 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className={cn(
        "flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors",
        "bg-white border-[var(--border)] focus-within:border-brand"
      )}>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask anything about your data..."
          className="flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none leading-relaxed max-h-[160px] disabled:opacity-50"
        />

        <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
          {value.length > 500 && (
            <span className={cn("text-[10px] shrink-0", value.length > 1000 ? "text-danger" : "text-[var(--text-muted)]")}>
              {value.length}/1000
            </span>
          )}

          {loading ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-[var(--text-dim)] border border-[var(--border)] hover:border-danger hover:text-danger transition-colors"
            >
              <Square size={11} fill="currentColor" />
              Cancel
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || disabled}
              className="flex items-center justify-center h-7 w-7 rounded-lg bg-brand text-white disabled:opacity-40 hover:bg-brand-dark transition-colors"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-[var(--text-muted)] text-center mt-1.5">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
})

PromptInput.displayName = "PromptInput"

export default PromptInput
