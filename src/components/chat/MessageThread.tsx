"use client"

import { useRef, useEffect } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/cn"
import TypingIndicator from "./TypingIndicator"
import ResultCard from "./ResultCard"
import ErrorCard from "./ErrorCard"
import type { ThreadMessage } from "@/store/chatStore"

interface MessageThreadProps {
  messages: ThreadMessage[]
  onFollowUp?: () => void
  onRetry?: (prompt: string) => void
}

export const MessageThread = ({ messages, onFollowUp, onRetry }: MessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, messages.at(-1)?.loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
      {messages.map((msg, idx) => {
        if (msg.role === "user") {
          return (
            <div key={msg.id} className="flex justify-end py-1 group">
              <div className="relative max-w-[75%]">
                <div className="bg-brand text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm leading-relaxed">
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
          <div key={msg.id} className="flex items-start gap-3 py-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--surface-3)] border border-[var(--border)] shrink-0 mt-1">
              <span className="text-xs font-bold text-brand">Q</span>
            </div>
            <div className="flex-1 min-w-0">
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
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
                  <ResultCard result={msg.result} onFollowUp={onFollowUp} />
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export default MessageThread
