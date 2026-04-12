"use client"

import { use, useEffect, useState, useCallback, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import SessionSidebar from "@/components/chat/SessionSidebar"
import ChatHeader from "@/components/chat/ChatHeader"
import MessageThread from "@/components/chat/MessageThread"
import PromptInput, { type PromptInputHandle } from "@/components/chat/PromptInput"
import SuggestedPrompts from "@/components/chat/SuggestedPrompts"
import type { ChatSession, QueryResult } from "@/types"

interface ChatPageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = use(params)
  const qc = useQueryClient()
  const { activeConnectionId, setActiveSession } = useAppStore()
  const { threads, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const [loading, setLoading] = useState(false)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)
  const inputRef = useRef<PromptInputHandle>(null)

  const { data: session } = useQuery<ChatSession>({
    queryKey: ["session", sessionId],
    queryFn: () => queryApi.session(sessionId) as Promise<ChatSession>,
    staleTime: 60_000,
  })

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
      const message = err instanceof Error && err.name === "AbortError" ? "Query cancelled." : (err instanceof Error ? err.message : "Query failed.")
      rejectMessage(sessionId, loadingId, message)
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
          <MessageThread messages={messages} onFollowUp={() => inputRef.current?.focus()} />
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
