"use client"

// ChatCanvas — Chat Engine v2 unified renderer.
//
// Rendering priority per assistant message:
//   1. msg.document (live v2 or rehydrated from answer_document)  → SessionCanvas
//   2. msg.loading (no document yet)                               → skeleton + stage
//   3. msg.error / msg.errorType                                   → ErrorCard
//   4. msg.result (legacy API response or rehydration fallback)    → ResultCard
//   5. nothing                                                      → null

import { useRef, useEffect, useCallback } from "react"
import { SessionCanvas } from "@/components/chat/canvas/SessionCanvas"
import { LegacyAnswer } from "@/components/chat/LegacyAnswer"
import { ClarifyCard } from "@/components/chat/ClarifyCard"
import { ReverifyCard } from "@/components/chat/ReverifyCard"
import ResultCard from "@/components/chat/ResultCard"
import TypingIndicator from "@/components/chat/TypingIndicator"
import { stageMicrocopy } from "@/lib/stageMicrocopy"
import type { ThreadMessage } from "@/store/chatStore"
import type { QueryResult } from "@/types"

// Ambiguous/declined answers render as a (non-error) clarify card.
function _declineText(m: ThreadMessage): string | null {
  const r = m.result
  if (!r) return null
  if (r.status === "declined" || r.status === "clarify_needed" || r.response_type === "clarify") {
    return (r.message || r.summary || "") as string
  }
  return null
}

const EMPTY_RESULT: QueryResult = {
  message_id: "", status: "success", summary: null, sql: null, chart_config: null,
  kpi_cards: [], columns: [], rows: [], assumptions: [], error_type: null, message: null,
  suggestions: [], execution_ms: null, total_ms: null,
}

interface Props {
  messages: ThreadMessage[]
  connectionName?: string
  connectionId?: string | null
  onFollowUp?: (q: string) => void
  onRetry?: (prompt: string) => void
}

export function ChatCanvas({ messages, connectionName, connectionId, onFollowUp, onRetry }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const isLoading = messages.some((m) => m.loading)
  const lastId = messages.at(-1)?.id

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom("instant")
    isFirstRender.current = false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isFirstRender.current) return
    scrollToBottom("smooth")
  }, [messages.length, lastId, isLoading, scrollToBottom])

  // Dedupe: a run of identical consecutive declines collapses to ONE card
  // (the most recent). Skip every decline whose next assistant message is an
  // identical decline.
  const skipDecline = (() => {
    const skip = new Set<string>()
    const assist = messages.filter((m) => m.role === "assistant").map((m) => ({ id: m.id, dt: _declineText(m) }))
    for (let i = 0; i < assist.length; i++) {
      const cur = assist[i]
      if (cur.dt === null) continue
      const next = assist[i + 1]
      if (next && next.dt === cur.dt) skip.add(cur.id)
    }
    return skip
  })()

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 max-w-4xl mx-auto w-full">
        {messages.map((msg, idx) => {
          // ── User message ─────────────────────────────────────────────────
          // Render the user's message as a right-aligned bubble before its
          // section (ChatGPT pattern). Optimistic: the bubble is added to the
          // thread on submit, so it appears instantly before the first SSE byte.
          // The panel still keeps the question chip.
          if (msg.role === "user") {
            if (!msg.prompt) return null
            return (
              <div key={msg.id} className="px-4 flex justify-end mb-5">
                <div
                  dir="auto"
                  className="max-w-[68%] rounded-2xl rounded-br-[4px] bg-violet text-white px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap break-words shadow-rest"
                >
                  {msg.prompt}
                </div>
              </div>
            )
          }

          // ── Assistant response ───────────────────────────────────────────
          const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === "user")

          // 1. v2 document (live streaming or rehydrated).
          // A declined/clarify result emits section_start (creating an EMPTY section) but never
          // adds cells, so rendering the doc would show a blank screen — fall through to the
          // clarify card below instead. Only genuine declines skip the doc (they have no content).
          if (msg.document?.sections?.length && _declineText(msg) === null) {
            return (
              <div key={msg.id}>
                <SessionCanvas
                  sections={msg.document.sections}
                  followUps={msg.document.follow_ups}
                  completionText={msg.document.completion_text}
                  messageId={msg.id}
                  onFollowUp={onFollowUp}
                />
                {/* Skeleton while more sections are still streaming */}
                {msg.loading && (
                  <div className="px-4 max-w-3xl mx-auto">
                    <div className="h-2 shimmer rounded w-2/3 mb-2" />
                    <div className="h-2 shimmer rounded w-1/2" />
                  </div>
                )}
              </div>
            )
          }

          // 2. Loading with no document yet
          if (msg.loading) {
            const partial = msg.partial
            const hasPartial = !!partial && Array.isArray(partial.rows) && partial.rows.length > 0
            return (
              <div key={msg.id} className="px-4">
                {hasPartial ? (
                  <div className="bg-surface border border-line rounded-card shadow-rest px-6 py-5">
                    <ResultCard
                      result={{ ...EMPTY_RESULT, ...partial } as QueryResult}
                      prompt={prevUser?.prompt}
                      connectionName={connectionName}
                    />
                    <div className="mt-4 flex items-center gap-2 text-xs text-ink-dim">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet animate-pulse-ring" />
                      {stageMicrocopy(msg.stage, connectionName)}
                    </div>
                  </div>
                ) : (
                  <TypingIndicator stage={msg.stage} connectionName={connectionName} />
                )}
              </div>
            )
          }

          // 2.4. Stale-model trap → honest re-verify card with a one-click action.
          if (msg.result?.response_type === "needs_reverification" || msg.result?.status === "needs_reverification") {
            return (
              <div key={msg.id} className="px-4">
                <ReverifyCard
                  message={(msg.result.message || msg.result.summary || "Your connection needs re-verification.") as string}
                  connectionId={connectionId}
                />
              </div>
            )
          }

          // 2.5. Ambiguous / declined → clarify card (NOT a red error card).
          const declineText = _declineText(msg)
          if (declineText !== null) {
            if (skipDecline.has(msg.id)) return null  // collapsed duplicate
            return (
              <div key={msg.id} className="px-4">
                <ClarifyCard
                  message={declineText || "I couldn't match that to a verified measure."}
                  suggestions={msg.result?.suggestions ?? []}
                  onSuggestion={onFollowUp}
                  onRetry={prevUser?.prompt ? () => onRetry?.(prevUser.prompt!) : undefined}
                />
              </div>
            )
          }

          // 3+4. Error or legacy result — LegacyAnswer is the single pre-v2 renderer
          if (msg.error || msg.errorType || msg.result) {
            return (
              <div key={msg.id} className="px-4">
                <LegacyAnswer
                  msg={msg}
                  prevPrompt={prevUser?.prompt}
                  connectionName={connectionName}
                  onFollowUp={onFollowUp}
                  onRetry={onRetry}
                />
              </div>
            )
          }

          return null
        })}
        <div ref={bottomRef} style={{ height: 1 }} aria-hidden />
      </div>
    </div>
  )
}

export default ChatCanvas
