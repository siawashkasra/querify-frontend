"use client"

import { useRef, useEffect, useState, KeyboardEvent } from "react"
import { CheckCircle2, Loader2, ArrowUp, AtSign, ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"
import type { ThreadMessage, PanelMessage } from "@/store/chatStore"
import type { QueryResult } from "@/types"

// ── step derivation ───────────────────────────────────────────────────────────

interface Step { label: string; done: boolean }

function deriveCompletedSteps(result: QueryResult): Step[] {
  const steps: Step[] = [
    { label: "Ran: understand_question", done: true },
    { label: "Ran: generate_sql", done: true },
  ]
  if (result.sql) steps.push({ label: "Ran: execute_query", done: true })
  if (result.summary || result.analytical_narrative) steps.push({ label: "Ran: summarise_results", done: true })
  if (result.kpi_cards?.length) steps.push({ label: "Ran: calculate_metrics", done: true })
  if (result.chart_config) steps.push({ label: "Ran: build_chart", done: true })
  steps.push({ label: "Ran: set_layout", done: true })
  return steps
}

const LOADING_STEP_LABELS = [
  "Ran: understand_question",
  "Ran: generate_sql",
  "Ran: execute_query",
  "Ran: summarise_results",
  "Ran: set_layout",
]

// ── animated steps when loading ───────────────────────────────────────────────

function useAnimatedSteps(isLoading: boolean) {
  const [visible, setVisible] = useState<number>(0)

  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setVisible(0), 0)
      return () => clearTimeout(t)
    }
    const t0 = setTimeout(() => setVisible(1), 0)
    const delays = [500, 1000, 1800, 2600]
    const timers = delays.map((d, i) =>
      setTimeout(() => setVisible(i + 2), d)
    )
    return () => {
      clearTimeout(t0)
      timers.forEach(clearTimeout)
    }
  }, [isLoading])

  return visible
}

// ── @mention helpers ──────────────────────────────────────────────────────────

function getMentionItems(result: QueryResult | undefined): string[] {
  if (!result) return []
  const items: string[] = []
  if (result.chart_config) items.push("chart")
  if (result.columns?.length) items.push("table")
  result.kpi_cards?.forEach((c) => items.push(c.label.toLowerCase().replace(/\s+/g, "_")))
  return items
}

function injectMentionContext(text: string, result: QueryResult | undefined): string {
  if (!result) return text
  let enriched = text
  if (enriched.includes("@chart") && result.chart_config) {
    const title = result.chart_config.title ? ` titled "${result.chart_config.title}"` : ""
    enriched = enriched.replace("@chart", `[the ${result.chart_config.type} chart${title}]`)
  }
  if (enriched.includes("@table") && result.columns?.length) {
    enriched = enriched.replace("@table", `[the data table with columns: ${result.columns.join(", ")}]`)
  }
  result.kpi_cards?.forEach((c) => {
    const key = "@" + c.label.toLowerCase().replace(/\s+/g, "_")
    if (enriched.includes(key)) {
      enriched = enriched.replace(key, `[the ${c.label} metric: ${c.value}]`)
    }
  })
  return enriched
}

// ── panel input ───────────────────────────────────────────────────────────────

interface PanelInputProps {
  onSubmit: (text: string) => void
  isLoading: boolean
  mentionItems: string[]
}

function PanelInput({ onSubmit, isLoading, mentionItems }: PanelInputProps) {
  const [value, setValue] = useState("")
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isLoading) ref.current?.focus()
  }, [isLoading])

  const handleChange = (v: string) => {
    setValue(v)
    const atIdx = v.lastIndexOf("@")
    if (atIdx !== -1) {
      const afterAt = v.slice(atIdx + 1)
      if (!afterAt.includes(" ") && mentionItems.length > 0) {
        setMentionFilter(afterAt.toLowerCase())
        setMentionOpen(true)
        return
      }
    }
    setMentionOpen(false)
  }

  const selectMention = (item: string) => {
    const atIdx = value.lastIndexOf("@")
    setValue(value.slice(0, atIdx) + "@" + item + " ")
    setMentionOpen(false)
    ref.current?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === "Escape") setMentionOpen(false)
  }

  const handleSubmit = () => {
    const prompt = value.trim()
    if (!prompt || isLoading) return
    setValue("")
    setMentionOpen(false)
    onSubmit(prompt)
  }

  const filtered = mentionItems.filter((m) => m.includes(mentionFilter))

  return (
    <div className="relative px-3 pb-3 pt-2 border-t border-[var(--border)]">
      {mentionOpen && filtered.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 rounded-lg border border-[var(--border)] bg-white shadow-lg overflow-hidden z-10">
          {filtered.map((item) => (
            <button
              key={item}
              onMouseDown={(e) => { e.preventDefault(); selectMention(item) }}
              className="w-full text-left px-3 py-2 text-xs font-mono text-[var(--text-dim)] hover:bg-[var(--surface-2)] transition-colors"
            >
              @{item}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2 rounded-lg border border-[var(--border)] bg-white px-2.5 py-2 focus-within:border-brand transition-colors">
        <button
          onMouseDown={(e) => { e.preventDefault(); setValue((v) => v + "@"); setMentionOpen(true); setMentionFilter(""); ref.current?.focus() }}
          className="p-0.5 text-[var(--text-muted)] hover:text-brand transition-colors shrink-0 mb-0.5"
          title="Mention"
        >
          <AtSign size={13} />
        </button>
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask about this result..."
          className="flex-1 resize-none bg-transparent text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: 80 }}
        />
        <button
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
          className="flex items-center justify-center h-6 w-6 rounded-md bg-brand text-white disabled:opacity-40 hover:bg-brand-dark transition-colors shrink-0 mb-0.5"
        >
          {isLoading ? <Loader2 size={11} className="animate-spin" /> : <ArrowUp size={11} />}
        </button>
      </div>
    </div>
  )
}

// ── panel message bubble ──────────────────────────────────────────────────────

function PanelBubble({ msg }: { msg: PanelMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-brand text-white rounded-xl rounded-tr-sm px-3 py-2 text-xs leading-relaxed">
          {msg.text}
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center justify-center h-5 w-5 rounded-full bg-[var(--surface-3)] border border-[var(--border)] shrink-0 mt-0.5">
        <span className="text-[9px] font-bold text-brand">Q</span>
      </div>
      <div className="flex-1 min-w-0">
        {msg.loading ? (
          <div className="flex items-center gap-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1 w-1 rounded-full bg-[var(--text-muted)] animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        ) : msg.error ? (
          <p className="text-xs text-danger">{msg.error}</p>
        ) : (
          <p className="text-xs text-[var(--text-dim)] leading-relaxed">{msg.text}</p>
        )}
      </div>
    </div>
  )
}

// ── main panel ────────────────────────────────────────────────────────────────

interface RightPanelProps {
  recentMessage: ThreadMessage | null
  panelMessages: PanelMessage[]
  onPanelSubmit: (text: string) => void
  isPanelLoading: boolean
  isVisible: boolean
  onToggle?: () => void
  sessionTitle?: string | null
  connectionName?: string
  currentResult: QueryResult | undefined
}

export function RightPanel({
  recentMessage,
  panelMessages,
  onPanelSubmit,
  isPanelLoading,
  isVisible,
  currentResult,
}: RightPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const isLoading = recentMessage?.loading === true
  const visibleCount = useAnimatedSteps(isLoading)
  const [stepsOpen, setStepsOpen] = useState(true)
  const mentionItems = getMentionItems(currentResult)

  const completedSteps = currentResult ? deriveCompletedSteps(currentResult) : []
  const completionText = (() => {
    if (!currentResult) return null
    const summary = currentResult.summary || currentResult.analytical_narrative
    if (!summary) return null
    return summary.split("\n\n")[0].slice(0, 300)
  })()

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [panelMessages.length, isLoading])

  const handlePanelSubmit = (text: string) => {
    const enriched = injectMentionContext(text, currentResult)
    onPanelSubmit(enriched)
  }

  if (!isVisible) {
    // Collapsed — render nothing; the toggle button lives in the page layout
    return null
  }

  return (
    <div className="flex flex-col shrink-0 border-l border-[var(--border)] bg-[var(--surface)] md:w-[280px] xl:w-[340px] overflow-hidden">
      {/* header */}
      <div className="flex items-center h-11 px-4 border-b border-[var(--border)] shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex-1">
          Analysis
        </span>
      </div>

      {/* body */}
      <div ref={bodyRef} className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 min-h-0">

        {/* analysis steps section */}
        {(isLoading || completedSteps.length > 0) && (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setStepsOpen((o) => !o)}
              className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors select-none"
            >
              <ChevronDown size={11} className={cn("transition-transform", !stepsOpen && "-rotate-90")} />
              Analysis
            </button>

            {stepsOpen && (
              <div className="flex flex-col gap-2 pl-1 mt-1">
                {isLoading
                  ? LOADING_STEP_LABELS.slice(0, visibleCount).map((label, i) => (
                      <div key={i} className="flex items-center gap-2 animate-[fadeSlideIn_0.25s_ease_forwards]">
                        {i < visibleCount - 1 ? (
                          <CheckCircle2 size={12} className="text-success shrink-0" />
                        ) : (
                          <Loader2 size={12} className="text-brand animate-spin shrink-0" />
                        )}
                        <span className="text-[11px] font-mono text-[var(--text-dim)]">{label}</span>
                      </div>
                    ))
                  : completedSteps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 size={12} className="text-success shrink-0" />
                        <span className="text-[11px] font-mono text-[var(--text-dim)]">{step.label}</span>
                      </div>
                    ))
                }
              </div>
            )}
          </div>
        )}

        {/* completion message */}
        {completionText && !isLoading && (
          <div className="flex items-start gap-2">
            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-brand/10 border border-brand/20 shrink-0 mt-0.5">
              <span className="text-[9px] font-bold text-brand">Q</span>
            </div>
            <div className="flex-1 min-w-0 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl rounded-tl-sm px-3 py-2">
              <p className="text-xs text-[var(--text-dim)] leading-relaxed">{completionText}</p>
            </div>
          </div>
        )}

        {/* panel conversation */}
        {panelMessages.map((msg) => (
          <PanelBubble key={msg.id} msg={msg} />
        ))}

        {!isLoading && !completedSteps.length && !panelMessages.length && (
          <p className="text-xs text-[var(--text-muted)] italic text-center py-4">
            Run a query to see the analysis steps here.
          </p>
        )}
      </div>

      {/* footer input */}
      <PanelInput
        onSubmit={handlePanelSubmit}
        isLoading={isPanelLoading}
        mentionItems={mentionItems}
      />
    </div>
  )
}

export default RightPanel
