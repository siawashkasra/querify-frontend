"use client"

import { useRef, useEffect, useState, KeyboardEvent, forwardRef, useImperativeHandle } from "react"
import { ArrowUp, Square, Paperclip } from "lucide-react"
import { cn } from "@/lib/cn"

export interface BottomPromptInputHandle {
  focus: () => void
  setValue: (v: string) => void
}

interface BottomPromptInputProps {
  onSubmit: (prompt: string) => void
  onCancel: () => void
  loading: boolean
  disabled?: boolean
  placeholder?: string
}

export const BottomPromptInput = forwardRef<BottomPromptInputHandle, BottomPromptInputProps>(
  ({ onSubmit, onCancel, loading, disabled, placeholder = "Ask a follow-up..." }, fwdRef) => {
    const [value, setValue] = useState("")
    const ref = useRef<HTMLTextAreaElement>(null)

    useImperativeHandle(fwdRef, () => ({
      focus: () => ref.current?.focus(),
      setValue: (v: string) => setValue(v),
    }))

    useEffect(() => {
      if (!loading) ref.current?.focus()
    }, [loading])

    useEffect(() => {
      const ta = ref.current
      if (!ta) return
      ta.style.height = "auto"
      ta.style.height = `${Math.min(ta.scrollHeight, 112)}px`
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
      <div className="px-6 py-3 border-t border-[var(--border)] bg-[var(--surface)]">
        <div
          className={cn(
            "flex items-end gap-2 rounded-xl border px-3 py-2 transition-colors bg-white",
            "border-[var(--border)] focus-within:border-brand"
          )}
        >
          <button
            disabled
            className="p-1 text-[var(--text-muted)] opacity-40 cursor-not-allowed shrink-0 mb-0.5"
            title="Attachments coming soon"
          >
            <Paperclip size={15} />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 resize-none bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none leading-relaxed disabled:opacity-50"
            style={{ maxHeight: 112 }}
          />
          <div className="flex items-center shrink-0 mb-0.5">
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
      </div>
    )
  }
)

BottomPromptInput.displayName = "BottomPromptInput"

export default BottomPromptInput
