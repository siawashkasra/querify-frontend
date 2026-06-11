"use client"

// ChatCanvas — Chat Engine v2 (E12).
// Replaces MessageThread + StreamingAnalysis + ResponseRenderer + AnalyticalResponseCard.
//
// Rendering priority per assistant message:
//   1. msg.document (live v2 or rehydrated from answer_document)  → SessionCanvas
//   2. msg.loading (no document yet)                               → skeleton + stage
//   3. msg.error / msg.errorType                                   → ErrorCard
//   4. msg.result (legacy API response or rehydration fallback)    → ResultCard
//   5. nothing                                                      → null

import { useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import { SessionCanvas } from "@/components/chat/canvas/SessionCanvas"
import ResultCard from "@/components/chat/ResultCard"
import ErrorCard from "@/components/chat/ErrorCard"
import TypingIndicator from "@/components/chat/TypingIndicator"
import type { ThreadMessage } from "@/store/chatStore"
import type { QueryResult } from "@/types"

const EMPTY_RESULT: QueryResult = {
  message_id: "", status: "success", summary: null, sql: null, chart_config: null,
  kpi_cards: [], columns: [], rows: [], assumptions: [], error_type: null, message: null,
  suggestions: [], execution_ms: null, total_ms: null,
}

interface Props {
  messages: ThreadMessage[]
  connectionName?: string
  onFollowUp?: (q: string) => void
  onRetry?: (prompt: string) => void
}

export function ChatCanvas({ messages, connectionName, onFollowUp, onRetry }: Props) {
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

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-6 py-6 max-w-4xl mx-auto w-full">
        {messages.map((msg, idx) => {
          // ── User bubble ──────────────────────────────────────────────────
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end group px-4">
                <div className="relative max-w-[70%]">
                  <div className="bg-violet-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                    {msg.prompt}
                  </div>
                  <p className="absolute -bottom-4 right-0 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {format(msg.createdAt, "HH:mm")}
                  </p>
                </div>
              </div>
            )
          }

          // ── Assistant response ───────────────────────────────────────────
          const prevUser = messages.slice(0, idx).reverse().find((m) => m.role === "user")

          // 1. v2 document (live streaming or rehydrated)
          if (msg.document?.sections?.length) {
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
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-2/3 mb-2" />
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-1/2" />
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
                  <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm px-6 py-5">
                    <ResultCard
                      result={{ ...EMPTY_RESULT, ...partial } as QueryResult}
                      prompt={prevUser?.prompt}
                      connectionName={connectionName}
                    />
                    <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-pulse" />
                      {msg.stage || "Analysing…"}
                    </div>
                  </div>
                ) : (
                  <TypingIndicator stage={msg.stage} />
                )}
              </div>
            )
          }

          // 3. Error
          if (msg.error || msg.errorType) {
            return (
              <div key={msg.id} className="px-4">
                <ErrorCard
                  errorType={msg.errorType}
                  errorDetail={msg.errorDetail}
                  onRetry={
                    msg.retryPrompt && onFollowUp ? () => onFollowUp(msg.retryPrompt!)
                    : onRetry && prevUser?.prompt ? () => onRetry(prevUser.prompt!) : undefined
                  }
                  retryLabel={msg.retryPrompt ? "Run on last 30 days" : undefined}
                  onRephrase={onFollowUp ? () => onFollowUp("") : undefined}
                />
              </div>
            )
          }

          // 4. Legacy result (no v2 document — history messages pre-E1, or panel_message)
          if (msg.result) {
            return (
              <div key={msg.id} className="px-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm px-6 py-5">
                  <ResultCard
                    result={msg.result}
                    prompt={prevUser?.prompt}
                    connectionName={connectionName}
                    onFollowUp={onFollowUp ? () => onFollowUp("") : undefined}
                  />
                </div>
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
