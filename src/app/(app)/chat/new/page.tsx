"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/store/appStore"
import { query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import SessionSidebar from "@/components/chat/SessionSidebar"
import ChatHeader from "@/components/chat/ChatHeader"
import MessageThread from "@/components/chat/MessageThread"
import PromptInput, { type PromptInputHandle } from "@/components/chat/PromptInput"
import SuggestedPrompts from "@/components/chat/SuggestedPrompts"
import type { QueryResult } from "@/types"

const NEW_SESSION_KEY = "__new__"

export default function NewChatPage() {
  const router = useRouter()
  const { activeConnectionId } = useAppStore()
  const { threads, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const pendingSubmit = useRef<string | null>(null)
  const inputRef = useRef<PromptInputHandle>(null)

  const threadKey = sessionId ?? NEW_SESSION_KEY
  const messages = threads[threadKey] ?? []

  const ensureSession = async (connectionId: string): Promise<string> => {
    if (sessionId) return sessionId
    const session = await queryApi.createSession({ connection_id: connectionId })
    setSessionId(session.id)
    router.replace(`/chat/${session.id}`)
    return session.id
  }

  const handleSubmit = async (prompt: string) => {
    if (!activeConnectionId) return
    setLoading(true)

    const sid = sessionId ?? NEW_SESSION_KEY
    addUserMessage(sid, prompt)
    const loadingId = addLoadingMessage(sid)

    try {
      const resolvedSession = await ensureSession(activeConnectionId)
      const signal = getSignal()
      const result = await queryApi.execute({ prompt, session_id: resolvedSession, connection_id: activeConnectionId }, signal) as QueryResult
      resolveMessage(resolvedSession, loadingId, result)
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError"
      const apiErr = err as { error_type?: string; message?: string } | null
      const message = isAbort ? "Query cancelled." : (apiErr?.message ?? "Query failed.")
      const errorType = isAbort ? null : (apiErr?.error_type ?? null)
      const key = sessionId ?? NEW_SESSION_KEY
      rejectMessage(key, loadingId, message, errorType, message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (pendingSubmit.current) {
      const prompt = pendingSubmit.current
      pendingSubmit.current = null
      handleSubmit(prompt)
    }
  })

  const handleChipSelect = (prompt: string) => {
    if (!loading) handleSubmit(prompt)
  }

  return (
    <div className="flex h-full">
      <SessionSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full">
        <ChatHeader sessionTitle={null} />
        {messages.length === 0 ? (
          <SuggestedPrompts onSelect={handleChipSelect} />
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
