"use client"

import { useRef, useEffect, useCallback } from "react"
import { format } from "date-fns"
import TypingIndicator from "./TypingIndicator"
import ResultCard from "./ResultCard"
import ResponseRenderer from "./ResponseRenderer"
import ErrorCard from "./ErrorCard"
import AnalyticalResponseCard from "./AnalyticalResponseCard"
import type { ThreadMessage } from "@/store/chatStore"

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

          return (
            <div key={msg.id} className="flex flex-col gap-4">
              {msg.loading && <TypingIndicator />}
              {!msg.loading && (msg.error || msg.errorType) && (
                <ErrorCard
                  errorType={msg.errorType}
                  errorDetail={msg.errorDetail}
                  onRetry={onRetry && prevUserMsg?.prompt ? () => onRetry(prevUserMsg.prompt!) : undefined}
                  onRephrase={onFollowUp}
                />
              )}
              {!msg.loading && !msg.error && !msg.errorType && msg.result && (
                <div className="bg-white border border-[var(--border)] rounded-2xl shadow-sm px-6 py-5">
                  {msg.result.response_type === "analytical" ? (
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
