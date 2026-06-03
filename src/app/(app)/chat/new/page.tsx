"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function NewChatPageWrapper() {
  return (
    <Suspense>
      <NewChatPage />
    </Suspense>
  )
}

function NewChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { activeConnectionId, setActiveConnection } = useAppStore()
  const { threads, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage, migrateThread } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const pendingSubmit = useRef<string | null>(null)
  const inputRef = useRef<PromptInputHandle>(null)
  const autoSubmitDone = useRef(false)

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
      if (resolvedSession !== sid) migrateThread(sid, resolvedSession)
      const signal = getSignal()
      const result = await queryApi.execute({ prompt, session_id: resolvedSession, connection_id: activeConnectionId }, signal) as QueryResult
      if (result.status === "failed" || result.status === "timeout") {
        rejectMessage(resolvedSession, loadingId, result.message ?? "Query failed.", result.error_type ?? null, result.message ?? null)
      } else {
        resolveMessage(resolvedSession, loadingId, result)
      }
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

  useEffect(() => {
    const draftParam = searchParams.get("draft")
    if (!draftParam) return
    queueMicrotask(() => inputRef.current?.setValue(draftParam))
  }, [searchParams])

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (autoSubmitDone.current) return
    const promptParam = searchParams.get("prompt")
    const connParam = searchParams.get("connection")
    if (!promptParam || searchParams.get("draft")) return
    autoSubmitDone.current = true
    if (connParam && connParam !== activeConnectionId) setActiveConnection(connParam)
    handleSubmit(promptParam)
  }, [searchParams])
  /* eslint-enable react-hooks/exhaustive-deps */

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
