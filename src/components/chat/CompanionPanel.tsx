"use client"

// CompanionPanel — Chat Engine v2 (E8 complete).
// Driven by agentFeed — maps 1:1 to real SSE events. Zero synthetic rows.
// U6 — a calm activity ledger: violet question chips, ink decisions, mono Ran-
// rows ticking to green checks, a card completion message. Panel is ink-dim by
// default; only question chips and interactive elements carry violet.

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { ChevronDown, ChevronRight, ArrowUp, Info, AlertCircle, Check, Loader2, Copy, RotateCcw } from "lucide-react"
import { cn } from "@/lib/cn"
import { labelize } from "@/lib/labelize"
import type { AgentFeedItem, PanelMessage } from "@/store/chatStore"

// ── Typewriter (panel completion only) ────────────────────────────────────────
// U7 — the ONLY typewriter in the product. Canvas cells arrive composed; the
// panel summary types while the canvas stands finished. 18ms/char, instant under
// reduced-motion.
function Typewriter({ text }: { text: string }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(text.length)
      return
    }
    setN(0)
    const id = setInterval(() => {
      setN((prev) => {
        if (prev >= text.length) { clearInterval(id); return prev }
        return prev + 1
      })
    }, 18)
    return () => clearInterval(id)
  }, [text])
  return <>{text.slice(0, n)}</>
}

// ── Feed row renderers ────────────────────────────────────────────────────────

function FeedRow({ item }: { item: AgentFeedItem }) {
  switch (item.t) {
    case "question":
      return (
        <div className="flex justify-end mb-2">
          <div className="bg-violet text-white text-[13px] rounded-2xl rounded-br-[4px] px-3 py-1.5 max-w-[85%]">
            {item.text}
          </div>
        </div>
      )
    case "note":
      return (
        <div className="flex gap-2 items-start mb-1.5">
          {item.kind === "fallback_notice" ? (
            <AlertCircle size={11} className="text-caution flex-shrink-0 mt-0.5" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-violet flex-shrink-0 mt-1.5" />
          )}
          <span className="text-[13px] text-ink leading-snug">{item.text}</span>
        </div>
      )
    case "cell":
      return (
        <div className="flex items-center gap-2 mb-1">
          {item.status === "running" ? (
            <Loader2 size={12} className="text-violet animate-spin flex-shrink-0" />
          ) : item.status === "complete" ? (
            <Check size={12} className="text-verify flex-shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-alert flex-shrink-0" />
          )}
          <span className="text-[12px] font-data text-ink-dim">
            Ran: {labelize(item.name)}
          </span>
        </div>
      )
    case "layout":
      return (
        <div className="flex items-center gap-2 mb-1">
          <Check size={12} className="text-ink-dim flex-shrink-0" />
          <span className="text-[12px] font-data text-ink-dim">Ran set layout</span>
        </div>
      )
    default:
      return null
  }
}

// ── Section group ─────────────────────────────────────────────────────────────

interface SectionGroupProps {
  sectionId: string
  items: AgentFeedItem[]
  isActive: boolean
  onRetry?: (question: string) => void
}

function SectionGroup({ items, isActive, onRetry }: SectionGroupProps) {
  const [open, setOpen] = useState(isActive)

  useEffect(() => { if (isActive) setOpen(true) }, [isActive])

  const questionItem = items.find((i): i is Extract<AgentFeedItem, { t: "question" }> => i.t === "question")
  const completionItem = items.find((i): i is Extract<AgentFeedItem, { t: "completion" }> => i.t === "completion")
  const cellItems = items.filter((i): i is Extract<AgentFeedItem, { t: "cell" }> => i.t === "cell")
  const runningCells = cellItems.filter((c) => c.status === "running").length
  const completedCells = cellItems.filter((c) => c.status === "complete").length
  const totalCells = cellItems.length
  const [copied, setCopied] = useState(false)

  // FIX 3c — never the bare "Section" placeholder; the question is always
  // present (section_start), so the chip reads as the user's question.
  const title = questionItem?.text.slice(0, 45) || "Answer"

  // FIX 4 — the fallback note (and any agent note) shows ONCE per section in the
  // panel feed; dedupe identical notes so it never repeats consecutively.
  const seenNotes = new Set<string>()
  const feedItems = items
    .filter((i) => i.t !== "completion")
    .filter((item) => {
      if (item.t !== "note") return true
      const key = `${item.kind}::${item.text}`
      if (seenNotes.has(key)) return false
      seenNotes.add(key)
      return true
    })

  const handleCopyCompletion = async () => {
    if (!completionItem) return
    try {
      await navigator.clipboard.writeText(completionItem.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="border-b border-line last:border-0">
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-surface transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown size={13} className="text-ink-dim flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-ink-dim flex-shrink-0" />
        )}
        <span className="text-[13px] font-medium text-ink truncate flex-1">
          {title}
        </span>
        {!open && totalCells > 0 && (
          <span className="text-[11px] text-ink-dim flex-shrink-0">{totalCells} cell{totalCells !== 1 ? "s" : ""}</span>
        )}
        {open && runningCells > 0 && (
          <Loader2 size={10} className="text-violet animate-spin flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 flex flex-col gap-1">
          {feedItems.map((item, i) => <FeedRow key={i} item={item} />)}

          {completionItem && (
            <div className="mt-2 bg-surface border border-line rounded-card shadow-rest p-3">
              <p className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
                <Typewriter text={completionItem.text} />
              </p>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handleCopyCompletion}
                  className="flex items-center gap-1 text-[11px] text-ink-dim hover:text-ink transition-colors"
                >
                  {copied ? <Check size={10} /> : <Copy size={10} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                {onRetry && questionItem && (
                  <button
                    onClick={() => onRetry(questionItem.text)}
                    className="flex items-center gap-1 text-[11px] text-ink-dim hover:text-ink transition-colors"
                  >
                    <RotateCcw size={10} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          )}

          {!completionItem && completedCells > 0 && (
            <p className="text-[11px] text-ink-dim mt-1">
              {completedCells} of {totalCells} cells complete
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Panel messages (QUICK answers) ───────────────────────────────────────────

function PanelMessageBubble({ msg }: { msg: PanelMessage }) {
  return (
    <div className={cn("px-4 py-1.5", msg.role === "user" ? "text-right" : "text-left")}>
      <div
        className={cn(
          "inline-block max-w-[85%] rounded-2xl px-3 py-2 text-[13px]",
          msg.role === "user"
            ? "bg-violet text-white rounded-br-[4px]"
            : "bg-surface border border-line text-ink"
        )}
      >
        {msg.loading ? (
          <span className="inline-flex gap-1 text-ink-dim">
            <span className="animate-bounce">·</span>
            <span className="animate-bounce [animation-delay:0.1s]">·</span>
            <span className="animate-bounce [animation-delay:0.2s]">·</span>
          </span>
        ) : (
          msg.error ?? msg.text
        )}
      </div>
    </div>
  )
}

// ── Panel composer ────────────────────────────────────────────────────────────

const KIND_GLYPH: Record<string, string> = {
  chart: "▦", table: "▤", metrics: "▣", comparison: "⇄", narrative: "¶", insights: "✦", title: "H",
}

function PanelComposer({
  onSubmit,
  disabled,
  followUpSuggestions,
  cells,
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
  followUpSuggestions?: string[]
  cells?: { name: string; kind: string }[]
}) {
  const [value, setValue] = useState("")
  const taRef = useRef<HTMLTextAreaElement>(null)

  // @mention dropdown: open when the caret sits in an unfinished @token.
  const mentionQuery = (() => {
    const m = /(?:^|\s)@([A-Za-z0-9_\-]*)$/.exec(value)
    return m ? m[1].toLowerCase() : null
  })()
  const mentionMatches = (mentionQuery !== null && cells)
    ? cells.filter((c) => c.name.toLowerCase().includes(mentionQuery)).slice(0, 6)
    : []

  const insertMention = (name: string) => {
    const next = value.replace(/(?:^|\s)@([A-Za-z0-9_\-]*)$/, (full) => {
      const lead = full.startsWith("@") ? "" : full[0]
      return `${lead}@${name} `
    })
    setValue(next)
    taRef.current?.focus()
  }

  const submit = () => {
    const t = value.trim()
    if (!t || disabled) return
    setValue("")
    onSubmit(t)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionMatches.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
      e.preventDefault()
      insertMention(mentionMatches[0].name)
      return
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="relative border-t border-line px-3 py-2.5 bg-paper">
      {/* @mention dropdown — floating card, cells grouped, kind glyphs */}
      {mentionMatches.length > 0 && (
        <div className="absolute bottom-full left-3 right-3 mb-1 bg-surface border border-line rounded-card shadow-float overflow-hidden z-20">
          {mentionMatches.map((c) => (
            <button
              key={c.name}
              onClick={() => insertMention(c.name)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-left text-[12px] text-ink hover:bg-violet-soft transition-colors"
            >
              <span className="text-ink-dim w-3 text-center">{KIND_GLYPH[c.kind] ?? "•"}</span>
              <span className="font-data truncate">{labelize(c.name)}</span>
            </button>
          ))}
        </div>
      )}

      {/* TASK 3 — follow-up suggestions seeded above the panel composer */}
      {followUpSuggestions && followUpSuggestions.length > 0 && !value && (
        <div className="flex flex-col gap-1 mb-2">
          {followUpSuggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={() => { if (!disabled) onSubmit(s) }}
              className="text-left text-[13px] text-violet hover:underline truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      {/* panel composer variant: card, focus-within ring */}
      <div className="flex items-end gap-2 rounded-[14px] border border-line bg-surface shadow-rest px-3 py-2.5 focus-within:border-violet focus-within:ring-4 focus-within:ring-violet/[0.14] transition-all">
        <textarea
          ref={taRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a follow-up about this analysis…"
          className="flex-1 resize-none bg-transparent text-[13px] outline-none text-ink placeholder:text-ink-dim/60 leading-relaxed disabled:opacity-50"
          style={{ maxHeight: 80 }}
        />
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-violet text-white disabled:bg-line disabled:text-ink-dim hover:brightness-[0.94] transition-[filter]"
          aria-label="Send"
        >
          <ArrowUp size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface Props {
  agentFeed: AgentFeedItem[]
  panelMessages: PanelMessage[]
  onPanelMessage: (text: string) => void
  isLoading?: boolean
  className?: string
  /** Cells available for @mention (name + kind), grouped client-side. */
  cells?: { name: string; kind: string }[]
  /** Follow-up suggestions seeded above the composer after doc_done. */
  followUps?: string[]
  /** Re-run a section's original question as a fresh EXTEND. */
  onRetry?: (question: string) => void
}

export function CompanionPanel({ agentFeed, panelMessages, onPanelMessage, isLoading, className, cells, followUps, onRetry }: Props) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [panelMessages.length, agentFeed.length])

  // Group feed items by sectionId (preserve insertion order)
  const sections = (() => {
    const order: string[] = []
    const map = new Map<string, AgentFeedItem[]>()
    for (const item of agentFeed) {
      const sid = item.sectionId
      if (!map.has(sid)) { map.set(sid, []); order.push(sid) }
      map.get(sid)!.push(item)
    }
    return order.map((sid) => ({ sectionId: sid, items: map.get(sid)! }))
  })()

  const isEmpty = agentFeed.length === 0 && panelMessages.length === 0

  return (
    <div className={cn("flex flex-col h-full bg-paper border-l border-line", className)}>
      <div className="px-4 py-3 border-b border-line shrink-0">
        <h3 className="font-display text-[15px] font-semibold text-ink">Analysis</h3>
        <p className="text-[12px] text-ink-dim">Decisions &amp; quick answers</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((sec, i) => (
          <SectionGroup
            key={sec.sectionId}
            sectionId={sec.sectionId}
            items={sec.items}
            isActive={i === sections.length - 1}
            onRetry={onRetry}
          />
        ))}

        {panelMessages.length > 0 && (
          <div className="py-2">
            {panelMessages.map((msg) => (
              <PanelMessageBubble key={msg.id} msg={msg} />
            ))}
          </div>
        )}

        {isEmpty && (
          <div className="flex items-center justify-center h-32 text-[12px] text-ink-dim text-center px-4 leading-relaxed">
            Agent decisions and quick answers appear here as your query runs.
          </div>
        )}
        <div ref={endRef} />
      </div>

      <PanelComposer onSubmit={onPanelMessage} disabled={isLoading} cells={cells} followUpSuggestions={followUps} />
    </div>
  )
}
