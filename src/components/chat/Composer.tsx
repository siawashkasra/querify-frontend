"use client"

// Composer — Chat Engine v2 (E6).
// Two modes:
//   hero   — centered on an empty canvas, with greeting + starter chips
//   docked — anchored to the bottom, compact, smooth transition from hero
//
// The transition is driven by whether there is any content in the canvas
// (sections.length > 0 || loading).

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { ArrowUp, Database } from "lucide-react"
import { cn } from "@/lib/cn"
import { Chip } from "@/components/ui/Chip"
import { useAuthStore } from "@/store/authStore"

function timeGreeting(firstName: string | null): string {
  const h = new Date().getHours()
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
  return firstName ? `${salutation}, ${firstName}.` : `${salutation}.`
}

const STARTER_CHIPS = [
  "What was revenue last month?",
  "Show top 10 customers by orders",
  "Compare this year vs last year",
  "Why did sales drop in March?",
]

// Intent → dot tint for the "Jump back in" list (mirrors the sidebar icons).
const INTENT_DOT: Record<string, string> = {
  comparison: "bg-chart-2",
  trend: "bg-verify",
  diagnostic: "bg-caution",
  ranking: "bg-violet",
}

interface RecentSession {
  id: string
  title: string
  intent?: string | null
}

interface Props {
  onSubmit: (prompt: string) => void
  isLoading: boolean
  hasContent: boolean          // true when canvas has sections or a loading message
  connectionName?: string
  recentSessions?: RecentSession[]
  onJumpBack?: (sessionId: string) => void
  initialValue?: string
  /** Why a submit was blocked/failed — shown under the input, never silent. */
  errorMessage?: string | null
}

export function Composer({ onSubmit, isLoading, hasContent, connectionName, recentSessions, onJumpBack, initialValue, errorMessage }: Props) {
  const [value, setValue] = useState(initialValue ?? "")
  const ref = useRef<HTMLTextAreaElement>(null)
  const isDocked = hasContent || isLoading
  const user = useAuthStore((s) => s.user)
  const firstName = user?.name?.split(" ")[0] ?? null

  useEffect(() => {
    if (!isDocked) ref.current?.focus()
  }, [isDocked])

  useEffect(() => {
    const ta = ref.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`
  }, [value])

  // "/" focuses the composer from anywhere on the page (E6/E10).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/") return
      const el = document.activeElement
      const tag = el?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement)?.isContentEditable) return
      e.preventDefault()
      ref.current?.focus()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === "Escape") {
      // Esc clears the composer (E6).
      e.preventDefault()
      setValue("")
    }
    // Shift+Enter falls through → textarea inserts a newline.
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
        "w-full rounded-[14px] border bg-surface shadow-rest transition-all",
        "border-line focus-within:border-violet focus-within:ring-4 focus-within:ring-violet/[0.14]"
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
        className={cn(
          "w-full resize-none bg-transparent text-ink placeholder:text-ink-dim/60 outline-none leading-relaxed disabled:opacity-50 block",
          isDocked ? "px-4 pt-3.5 pb-2 text-[15px]" : "px-5 pt-5 pb-2 text-[15px]"
        )}
        style={{ maxHeight: 140 }}
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        {/* connection chip — db glyph + name, paper pill */}
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-dim bg-paper rounded-pill px-2.5 py-1 truncate max-w-[200px]">
          <Database size={11} className="shrink-0" />
          <span className="truncate">{connectionName ?? "No connection"}</span>
        </span>
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex items-center justify-center h-8 w-8 rounded-full bg-violet text-white disabled:bg-line disabled:text-ink-dim hover:brightness-[0.94] transition-[filter]"
          aria-label="Send"
        >
          <ArrowUp size={15} />
        </button>
      </div>
    </div>
  )

  // Block/failure reason — always visible, never a silent no-op.
  const errorRow = errorMessage ? (
    <p role="alert" className="mt-1.5 px-1 text-xs text-alert">
      {errorMessage}
    </p>
  ) : null

  // ── Hero mode (empty canvas) ──────────────────────────────────────────────
  if (!isDocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 gap-6 motion-safe:animate-[fadeSlideIn_0.2s_ease-out]">
        <div className="text-center">
          <h1 className="font-display text-[1.75rem] font-semibold text-ink tracking-[-0.01em] mb-2">{timeGreeting(firstName)}</h1>
          <p className="text-ink-dim text-sm">
            Ask a question about{connectionName ? ` ${connectionName}` : " your data"}.
          </p>
        </div>

        <div className="w-full max-w-xl">{inputBox}{errorRow}</div>

        <div className="flex flex-wrap gap-2 justify-center max-w-xl">
          {STARTER_CHIPS.map((chip) => (
            <Chip key={chip} onClick={() => onSubmit(chip)}>{chip}</Chip>
          ))}
        </div>

        {recentSessions && recentSessions.length > 0 && (
          <div className="w-full max-w-xl">
            <p className="text-xs text-ink-dim mb-2 font-medium uppercase tracking-wide">Jump back in</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {recentSessions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  onClick={() => onJumpBack?.(s.id)}
                  className="flex items-center gap-2 text-left px-3 py-2 rounded-ctrl text-sm text-ink hover:bg-surface hover:-translate-y-px transition-all truncate"
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", INTENT_DOT[s.intent ?? ""] ?? "bg-line")} />
                  <span className="truncate">{s.title || "Untitled session"}</span>
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
    <div className="sticky bottom-0 z-10 bg-paper/80 backdrop-blur-sm border-t border-line px-4 py-3">
      <div className="max-w-3xl mx-auto">{inputBox}{errorRow}</div>
    </div>
  )
}
