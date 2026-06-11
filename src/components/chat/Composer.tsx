"use client"

// Composer — Chat Engine v2 (E6).
// Two modes:
//   hero   — centered on an empty canvas, with greeting + starter chips
//   docked — anchored to the bottom, compact, smooth transition from hero
//
// The transition is driven by whether there is any content in the canvas
// (sections.length > 0 || loading).

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { ArrowUp, Zap } from "lucide-react"
import { cn } from "@/lib/cn"

const STARTER_CHIPS = [
  "What was revenue last month?",
  "Show top 10 customers by orders",
  "Compare this year vs last year",
  "Why did sales drop in March?",
]

interface Props {
  onSubmit: (prompt: string) => void
  isLoading: boolean
  hasContent: boolean          // true when canvas has sections or a loading message
  connectionName?: string
  recentSessions?: { id: string; title: string }[]
  onJumpBack?: (sessionId: string) => void
  initialValue?: string
}

export function Composer({ onSubmit, isLoading, hasContent, connectionName, recentSessions, onJumpBack, initialValue }: Props) {
  const [value, setValue] = useState(initialValue ?? "")
  const ref = useRef<HTMLTextAreaElement>(null)
  const isDocked = hasContent || isLoading

  useEffect(() => {
    if (!isDocked) ref.current?.focus()
  }, [isDocked])

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

  const inputBox = (
    <div
      className={cn(
        "w-full rounded-2xl border-[1.5px] bg-white dark:bg-gray-900 transition-all shadow-sm",
        "border-gray-200 dark:border-gray-700 focus-within:border-violet-500 focus-within:shadow-[0_0_0_3px_rgba(124,58,237,0.08)]"
      )}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        placeholder={isDocked ? "Follow up…" : "Ask anything about your data…"}
        className="w-full resize-none bg-transparent px-5 pt-4 pb-3 text-[15px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none leading-relaxed disabled:opacity-50 block"
        style={{ maxHeight: 140 }}
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[180px]">
          {connectionName ?? "No connection"}
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-xl bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors"
          aria-label="Send"
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  )

  // ── Hero mode (empty canvas) ──────────────────────────────────────────────
  if (!isDocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 gap-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 mb-3">
            <Zap size={20} className="text-violet-500" />
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">Querify</span>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Ask a question about{connectionName ? ` ${connectionName}` : " your data"}.
          </p>
        </div>

        <div className="w-full max-w-xl">{inputBox}</div>

        <div className="flex flex-wrap gap-2 justify-center max-w-xl">
          {STARTER_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => onSubmit(chip)}
              className="text-sm px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        {recentSessions && recentSessions.length > 0 && (
          <div className="w-full max-w-xl">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium uppercase tracking-wide">Jump back in</p>
            <div className="flex flex-col gap-1">
              {recentSessions.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onJumpBack?.(s.id)}
                  className="text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors truncate"
                >
                  {s.title || "Untitled session"}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Docked mode (canvas has content) ─────────────────────────────────────
  return (
    <div className="sticky bottom-0 z-10 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 px-4 py-3">
      <div className="max-w-3xl mx-auto">{inputBox}</div>
    </div>
  )
}
