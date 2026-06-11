"use client"

// CompanionPanel — Chat Engine v2 (E8).
// Shows per-section agent notes + QUICK panel messages.
// Collapses prior sections to a single summary line.

import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { ChevronDown, ChevronRight, ArrowUp, Info, AlertCircle } from "lucide-react"
import { cn } from "@/lib/cn"
import type { AgentNote, AnswerSection } from "@/types"
import type { PanelMessage } from "@/store/chatStore"

// ── Agent note pill ───────────────────────────────────────────────────────────

function AgentNotePill({ note }: { note: AgentNote }) {
  const icon =
    note.kind === "fallback_notice" ? (
      <AlertCircle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
    ) : (
      <Info size={12} className="text-blue-500 flex-shrink-0 mt-0.5" />
    )
  return (
    <div className="flex gap-2 items-start text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded-md px-2.5 py-1.5">
      {icon}
      <span>{note.text}</span>
    </div>
  )
}

// ── Section feed row ──────────────────────────────────────────────────────────

interface SectionFeedProps {
  section: AnswerSection
  isActive: boolean
}

function SectionFeed({ section, isActive }: SectionFeedProps) {
  const [open, setOpen] = useState(isActive)
  const notes = section.agent_notes ?? []
  const cellCount = section.cells.length

  return (
    <div className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <button
        className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate flex-1">
          {section.title ?? section.question}
        </span>
        {!open && (
          <span className="text-xs text-gray-400 flex-shrink-0">{cellCount} cells</span>
        )}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-2">
          {notes.length > 0 && (
            <div className="space-y-1.5">
              {notes.map((note, i) => (
                <AgentNotePill key={i} note={note} />
              ))}
            </div>
          )}
          {notes.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No notes for this section.</p>
          )}
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {cellCount} {cellCount === 1 ? "cell" : "cells"}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Panel messages (QUICK answers) ───────────────────────────────────────────

function PanelMessageBubble({ msg }: { msg: PanelMessage }) {
  return (
    <div className={cn("px-4 py-2", msg.role === "user" ? "text-right" : "text-left")}>
      <div
        className={cn(
          "inline-block max-w-[85%] rounded-2xl px-3 py-2 text-sm",
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

// ── Composer (panel) ──────────────────────────────────────────────────────────

function PanelComposer({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled?: boolean }) {
  const [value, setValue] = useState("")
  const ref = useRef<HTMLTextAreaElement>(null)

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
    <div className="border-t border-gray-200 dark:border-gray-800 px-3 py-2 flex items-end gap-2">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask a quick question…"
        className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2 text-sm outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
        className="flex-shrink-0 flex items-center justify-center h-8 w-8 rounded-full bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors"
        aria-label="Send"
      >
        <ArrowUp size={13} />
      </button>
    </div>
  )
}

// ── Main CompanionPanel ───────────────────────────────────────────────────────

interface Props {
  sections: AnswerSection[]
  panelMessages: PanelMessage[]
  onPanelMessage: (text: string) => void
  isLoading?: boolean
  className?: string
}

export function CompanionPanel({ sections, panelMessages, onPanelMessage, isLoading, className }: Props) {
  const msgEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    msgEnd.current?.scrollIntoView({ behavior: "smooth" })
  }, [panelMessages.length])

  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800", className)}>
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Context</h3>
        <p className="text-xs text-gray-400 dark:text-gray-500">Notes &amp; quick answers</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Section feed — agent notes per section */}
        {sections.length > 0 && (
          <div className="border-b border-gray-200 dark:border-gray-800">
            {sections.map((sec, i) => (
              <SectionFeed key={sec.id} section={sec} isActive={i === sections.length - 1} />
            ))}
          </div>
        )}

        {/* Panel messages (QUICK answers) */}
        {panelMessages.length > 0 && (
          <div className="py-2">
            {panelMessages.map((msg) => (
              <PanelMessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={msgEnd} />
          </div>
        )}

        {sections.length === 0 && panelMessages.length === 0 && (
          <div className="flex items-center justify-center h-32 text-xs text-gray-400 dark:text-gray-500 text-center px-4">
            Agent notes and quick answers will appear here.
          </div>
        )}
      </div>

      <PanelComposer onSubmit={onPanelMessage} disabled={isLoading} />
    </div>
  )
}
