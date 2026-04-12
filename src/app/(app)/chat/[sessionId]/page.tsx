"use client"

import { use, useEffect, useState, useCallback, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import type { ThreadMessage } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import SessionSidebar from "@/components/chat/SessionSidebar"
import ChatHeader from "@/components/chat/ChatHeader"
import MessageThread from "@/components/chat/MessageThread"
import PromptInput, { type PromptInputHandle } from "@/components/chat/PromptInput"
import SuggestedPrompts from "@/components/chat/SuggestedPrompts"
import type { ChatMessage, ChatSession, QueryResult } from "@/types"

interface ChatPageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = use(params)
  const qc = useQueryClient()
  const { activeConnectionId, setActiveSession } = useAppStore()
  const { threads, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage, loadThread } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const [loading, setLoading] = useState(false)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)
  const inputRef = useRef<PromptInputHandle>(null)

  const { data: session } = useQuery<ChatSession>({
    queryKey: ["session", sessionId],
    queryFn: () => queryApi.session(sessionId) as Promise<ChatSession>,
    staleTime: 60_000,
  })

  const { data: apiMessages } = useQuery<ChatMessage[]>({
    queryKey: ["session-messages", sessionId],
    queryFn: () => queryApi.history({ session_id: sessionId, limit: 100 }) as Promise<ChatMessage[]>,
    staleTime: Infinity,
    enabled: !threads[sessionId]?.length,
  })

  useEffect(() => {
    if (!apiMessages?.length || threads[sessionId]?.length) return
    const hydrated = apiMessages.flatMap((m): ThreadMessage[] => {
      const userMsg: ThreadMessage = { id: `${m.id}-user`, role: "user", prompt: m.prompt, createdAt: new Date(m.created_at) }
      const assistantMsg: ThreadMessage = {
        id: m.id,
        role: "assistant",
        createdAt: new Date(m.created_at),
        ...(m.status === "failed" || m.error_type
          ? { error: m.error_message ?? "Query failed.", errorType: m.error_type, errorDetail: m.error_message }
          : { result: { message_id: m.id, status: m.status, summary: m.result_summary, sql: m.sql_generated, chart_config: m.chart_config, kpi_cards: m.kpi_cards ?? [], columns: (m.result_columns as string[] | null) ?? [], rows: [], assumptions: m.assumptions ?? [], error_type: m.error_type, message: m.error_message, suggestions: [], execution_ms: m.execution_ms, total_ms: m.total_response_ms ?? null } }),
      }
      return [userMsg, assistantMsg]
    })
    loadThread(sessionId, hydrated)
  }, [apiMessages, sessionId, threads, loadThread])

  useEffect(() => {
    setActiveSession(sessionId)
    if (session?.title) setSessionTitle(session.title)
  }, [sessionId, session, setActiveSession])

  const messages = threads[sessionId] ?? []

  const handleSubmit = useCallback(async (prompt: string) => {
    if (!activeConnectionId) return
    setLoading(true)
    addUserMessage(sessionId, prompt)
    const loadingId = addLoadingMessage(sessionId)
    try {
      const signal = getSignal()
      const result = await queryApi.execute({ prompt, session_id: sessionId, connection_id: activeConnectionId }, signal) as QueryResult
      resolveMessage(sessionId, loadingId, result)
      if (!sessionTitle) {
        const truncated = prompt.slice(0, 40)
        setSessionTitle(truncated)
        qc.invalidateQueries({ queryKey: ["sessions"] })
      }
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError"
      const apiErr = err as { error_type?: string; message?: string } | null
      const message = isAbort ? "Query cancelled." : (apiErr?.message ?? "Query failed.")
      const errorType = isAbort ? null : (apiErr?.error_type ?? null)
      rejectMessage(sessionId, loadingId, message, errorType, message)
    } finally {
      setLoading(false)
    }
  }, [activeConnectionId, sessionId, sessionTitle, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage, getSignal, qc])

  return (
    <div className="flex h-full">
      <SessionSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader sessionTitle={sessionTitle ?? session?.title ?? null} onTitleChange={setSessionTitle} />
        {messages.length === 0 ? (
          <SuggestedPrompts onSelect={handleSubmit} />
        ) : (
          <MessageThread messages={messages} onFollowUp={() => inputRef.current?.focus()} onRetry={handleSubmit} />
        )}
        <PromptInput
          ref={inputRef}
          onSubmit={handleSubmit}
          onCancel={cancel}
          loading={loading}
          disabled={!activeConnectionId}
        />
      </div>
    </div>
  )
}
