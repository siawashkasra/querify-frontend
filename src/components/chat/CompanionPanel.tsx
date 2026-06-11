"use client"

// CompanionPanel — Chat Engine v2 (E8 complete).
// Driven by agentFeed — maps 1:1 to real SSE events. Zero synthetic rows.

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { ChevronDown, ChevronRight, ArrowUp, Info, AlertCircle, Check, Loader2, Copy } from "lucide-react"
import { cn } from "@/lib/cn"
import type { AgentFeedItem, PanelMessage } from "@/store/chatStore"

// ── Feed row renderers ────────────────────────────────────────────────────────

function FeedRow({ item }: { item: AgentFeedItem }) {
  switch (item.t) {
    case "question":
      return (
        <div className="flex justify-end mb-2">
          <div className="bg-violet-600 text-white text-xs rounded-2xl rounded-tr-sm px-3 py-1.5 max-w-[85%]">
            {item.text}
          </div>
        </div>
      )
    case "note":
      return (
        <div className="flex gap-2 items-start mb-1.5">
          {item.kind === "fallback_notice" ? (
            <AlertCircle size={11} className="text-amber-500 flex-shrink-0 mt-0.5" />
          ) : (
            <Info size={11} className="text-blue-500 flex-shrink-0 mt-0.5" />
          )}
          <span className="text-[11px] text-gray-600 dark:text-gray-400 leading-snug">{item.text}</span>
        </div>
      )
    case "cell":
      return (
        <div className="flex items-center gap-2 mb-1">
          {item.status === "running" ? (
            <Loader2 size={10} className="text-violet-500 animate-spin flex-shrink-0" />
          ) : item.status === "complete" ? (
            <Check size={10} className="text-green-500 flex-shrink-0" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0" />
          )}
          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
            Ran: {item.name}
          </span>
        </div>
      )
    case "layout":
      return (
        <div className="flex items-center gap-2 mb-1">
          <Check size={10} className="text-gray-400 flex-shrink-0" />
          <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500">Ran set layout</span>
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
}

function SectionGroup({ sectionId, items, isActive }: SectionGroupProps) {
  const [open, setOpen] = useState(isActive)

  useEffect(() => { if (isActive) setOpen(true) }, [isActive])

  const questionItem = items.find((i): i is Extract<AgentFeedItem, { t: "question" }> => i.t === "question")
  const completionItem = items.find((i): i is Extract<AgentFeedItem, { t: "completion" }> => i.t === "completion")
  const cellItems = items.filter((i): i is Extract<AgentFeedItem, { t: "cell" }> => i.t === "cell")
  const runningCells = cellItems.filter((c) => c.status === "running").length
  const completedCells = cellItems.filter((c) => c.status === "complete").length
  const totalCells = cellItems.length
  const [copied, setCopied] = useState(false)

  const title = questionItem?.text.slice(0, 45) ?? "Section"

  const handleCopyCompletion = async () => {
    if (!completionItem) return
    try {
      await navigator.clipboard.writeText(completionItem.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* ignore */ }
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown size={13} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={13} className="text-gray-400 flex-shrink-0" />
        )}
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate flex-1">
          {title}
        </span>
        {!open && totalCells > 0 && (
          <span className="text-[10px] text-gray-400 flex-shrink-0">{totalCells} cells</span>
        )}
        {open && runningCells > 0 && (
          <Loader2 size={10} className="text-violet-500 animate-spin flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-3">
          {items
            .filter((i) => i.t !== "completion")
            .map((item, i) => <FeedRow key={i} item={item} />)}

          {completionItem && (
            <div className="mt-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {completionItem.text}
              </p>
              <button
                onClick={handleCopyCompletion}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {copied ? <Check size={9} /> : <Copy size={9} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          {!completionItem && completedCells > 0 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
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
          "inline-block max-w-[85%] rounded-2xl px-3 py-2 text-xs",
          msg.role === "user"
            ? "bg-violet-600 text-white"
            : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
        )}
      >
        {msg.loading ? (
          <span className="inline-flex gap-1">
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

function PanelComposer({
  onSubmit,
  disabled,
  followUpSuggestions,
}: {
  onSubmit: (text: string) => void
  disabled?: boolean
  followUpSuggestions?: string[]
}) {
  const [value, setValue] = useState("")

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      const t = value.trim()
      if (!t || disabled) return
      setValue("")
      onSubmit(t)
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2">
      {followUpSuggestions && followUpSuggestions.length > 0 && !value && (
        <div className="flex flex-col gap-1 mb-2">
          {followUpSuggestions.slice(0, 3).map((s, i) => (
            <button
              key={i}
              onClick={() => { if (!disabled) onSubmit(s) }}
              className="text-left text-[11px] text-violet-600 dark:text-violet-400 hover:underline truncate"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <textarea
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask a follow-up… (@cell to reference)"
          className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-xs outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          style={{ maxHeight: 80 }}
        />
        <button
          onClick={() => {
            const t = value.trim()
            if (!t || disabled) return
            setValue("")
            onSubmit(t)
          }}
          disabled={!value.trim() || disabled}
          className="flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors"
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
}

export function CompanionPanel({ agentFeed, panelMessages, onPanelMessage, isLoading, className }: Props) {
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
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800", className)}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Analysis</h3>
        <p className="text-[10px] text-gray-400 dark:text-gray-500">Decisions &amp; quick answers</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sections.map((sec, i) => (
          <SectionGroup
            key={sec.sectionId}
            sectionId={sec.sectionId}
            items={sec.items}
            isActive={i === sections.length - 1}
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
          <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500 text-center px-4 leading-relaxed">
            Agent decisions and quick answers appear here as your query runs.
          </div>
        )}
        <div ref={endRef} />
      </div>

      <PanelComposer onSubmit={onPanelMessage} disabled={isLoading} />
    </div>
  )
}
