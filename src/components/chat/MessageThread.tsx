"use client"

import { useRef, useEffect } from "react"
import { format } from "date-fns"
import { cn } from "@/lib/cn"
import TypingIndicator from "./TypingIndicator"
import type { ThreadMessage } from "@/store/chatStore"
import type { QueryResult } from "@/types"

interface ResultCardProps {
  result: QueryResult
}

const ResultCard = ({ result }: ResultCardProps) => (
  <div className="flex flex-col gap-2">
    {result.summary && (
      <p className="text-sm text-[var(--text)]">{result.summary}</p>
    )}
    {result.rows && result.rows.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
        <table className="text-xs w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
              {result.columns?.map((col) => (
                <th key={col} className="text-left px-3 py-2 font-medium text-[var(--text-dim)] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.slice(0, 20).map((row, i) => (
              <tr key={i} className={cn("border-b border-[var(--border)] last:border-0", i % 2 === 0 ? "bg-[var(--surface-2)]" : "bg-[var(--surface)]")}>
                {result.columns?.map((col) => (
                  <td key={col} className="px-3 py-1.5 text-[var(--text)] font-mono whitespace-nowrap max-w-[200px] truncate">
                    {String(row[col] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.rows.length > 20 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-2">
            Showing 20 of {result.rows.length} rows
          </p>
        )}
      </div>
    )}
    {result.sql && (
      <details className="mt-1">
        <summary className="text-xs text-[var(--text-muted)] cursor-pointer select-none hover:text-[var(--text-dim)]">View SQL</summary>
        <pre className="mt-1.5 text-xs font-mono text-[var(--text-dim)] bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
          {result.sql}
        </pre>
      </details>
    )}
  </div>
)

interface ErrorCardProps {
  message: string
}

const ErrorCard = ({ message }: ErrorCardProps) => (
  <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3">
    <p className="text-sm text-danger font-medium">Something went wrong</p>
    <p className="text-xs text-[var(--text-dim)] mt-0.5">{message}</p>
  </div>
)

interface MessageThreadProps {
  messages: ThreadMessage[]
}

export const MessageThread = ({ messages }: MessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, messages.at(-1)?.loading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
      {messages.map((msg) => {
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

        return (
          <div key={msg.id} className="flex items-start gap-3 py-1">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[var(--surface-3)] border border-[var(--border)] shrink-0 mt-1">
              <span className="text-xs font-bold text-brand">Q</span>
            </div>
            <div className="flex-1 min-w-0">
              {msg.loading && <TypingIndicator />}
              {!msg.loading && msg.error && <ErrorCard message={msg.error} />}
              {!msg.loading && msg.result && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-2xl rounded-tl-sm px-4 py-3">
                  <ResultCard result={msg.result} />
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
