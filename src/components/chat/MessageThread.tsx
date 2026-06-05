"use client"

import { useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import TypingIndicator from "./TypingIndicator"
import ResultCard from "./ResultCard"
import ResponseRenderer from "./ResponseRenderer"
import ErrorCard from "./ErrorCard"
import AnalyticalResponseCard from "./AnalyticalResponseCard"
import StreamingAnalysis from "./StreamingAnalysis"
import type { ThreadMessage } from "@/store/chatStore"
import type { QueryResult } from "@/types"

// Base used to render a Stage-1 partial result before the full result arrives.
const EMPTY_RESULT: QueryResult = {
  message_id: "", status: "success", summary: null, sql: null, chart_config: null,
  kpi_cards: [], columns: [], rows: [], assumptions: [], error_type: null, message: null,
  suggestions: [], execution_ms: null, total_ms: null,
}

interface MessageThreadProps {
  messages: ThreadMessage[]
  connectionName?: string
  onFollowUp?: () => void
  onRetry?: (prompt: string) => void
  onSuggestedQuestion?: (question: string) => void
}

export const MessageThread = ({
  messages,
  connectionName,
  onFollowUp,
  onRetry,
  onSuggestedQuestion,
}: MessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const isLoading = messages.some((m) => m.loading)
  const lastMessageId = messages.at(-1)?.id

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
  }, [messages.length, lastMessageId, isLoading, scrollToBottom])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="flex flex-col gap-8 px-6 py-6 max-w-4xl mx-auto w-full">
        {messages.map((msg, idx) => {
          if (msg.role === "user") {
            return (
              <div key={msg.id} className="flex justify-end group">
                <div className="relative max-w-[70%]">
                  <div className="bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed">
                    {msg.prompt}
                  </div>
                  <p className="absolute -bottom-4 right-0 text-[10px] text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {format(msg.createdAt, "HH:mm")}
                  </p>
                </div>
              </div>
            )
          }

          const prevUserMsg = messages.slice(0, idx).reverse().find((m) => m.role === "user")

          const partial = msg.partial
          const hasPartial = !!partial && Array.isArray(partial.rows) && partial.rows.length > 0
          // Analytical streaming: a plan or findings have arrived — the answer
          // writes itself in progressively, section by section.
          const isStreamingAnalysis = !!msg.plan || (msg.findings?.length ?? 0) > 0

          return (
            <div key={msg.id} className="flex flex-col gap-4">
              {msg.loading && !hasPartial && !isStreamingAnalysis && <TypingIndicator stage={msg.stage} />}
              {/* Progressive analytical answer: plan → primary chart →
                  supporting findings → synthesized conclusion. */}
              {msg.loading && isStreamingAnalysis && (
                <StreamingAnalysis
                  plan={msg.plan}
                  findings={msg.findings}
                  partial={partial}
                  stage={msg.stage}
                  prompt={prevUserMsg?.prompt}
                  connectionName={connectionName}
                />
              )}
              {/* Stage 1 (single-shot path) — the answer (chart/number) appears
                  immediately, with an 'Analysing…' shimmer where the summary lands. */}
              {msg.loading && hasPartial && !isStreamingAnalysis && (
                <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm px-6 py-5">
                  <ResultCard result={{ ...EMPTY_RESULT, ...partial } as QueryResult} prompt={prevUserMsg?.prompt} connectionName={connectionName} />
                  <div className="mt-4 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" /> {msg.stage || "Analysing…"}
                  </div>
                </div>
              )}
              {!msg.loading && (msg.error || msg.errorType) && (
                <ErrorCard
                  errorType={msg.errorType}
                  errorDetail={msg.errorDetail}
                  onRetry={
                    msg.retryPrompt && onSuggestedQuestion ? () => onSuggestedQuestion(msg.retryPrompt!)
                    : onRetry && prevUserMsg?.prompt ? () => onRetry(prevUserMsg.prompt!) : undefined
                  }
                  retryLabel={msg.retryPrompt ? "Run on last 30 days" : undefined}
                  onRephrase={onFollowUp}
                />
              )}
              {!msg.loading && !msg.error && !msg.errorType && msg.result && (
                <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm px-6 py-5">
                  {/* The synthesized analytical answer renders as composed
                      blocks (headline → KPIs → charts → why → follow-ups);
                      the narrative card is the legacy fallback. */}
                  {msg.result.response_type === "analytical" && !(msg.result.blocks && msg.result.blocks.length > 0) ? (
                    <AnalyticalResponseCard
                      result={msg.result}
                      prompt={prevUserMsg?.prompt}
                      connectionName={connectionName}
                      onSuggestedQuestion={onSuggestedQuestion}
                    />
                  ) : msg.result.blocks && msg.result.blocks.length > 0 ? (
                    <ResponseRenderer
                      result={msg.result}
                      connectionName={connectionName}
                      onSuggestedQuestion={onSuggestedQuestion}
                      onFollowUp={onFollowUp}
                    />
                  ) : (
                    <ResultCard
                      result={msg.result}
                      prompt={prevUserMsg?.prompt}
                      connectionName={connectionName}
                      onFollowUp={onFollowUp}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} style={{ height: 1 }} aria-hidden />
      </div>
    </div>
  )
}

export default MessageThread
