"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAppStore } from "@/store/appStore"
import { query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import { runStreaming } from "@/lib/runStreaming"
import SessionSidebar from "@/components/chat/SessionSidebar"
import ChatHeader from "@/components/chat/ChatHeader"
import MessageThread from "@/components/chat/MessageThread"
import PromptInput, { type PromptInputHandle } from "@/components/chat/PromptInput"
import SuggestedPrompts from "@/components/chat/SuggestedPrompts"

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
  const { threads, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage, setMessageStage, setMessagePartial, setMessagePlan, addMessageFinding, migrateThread, v2SectionStart, v2CellComplete, v2CellUpdate, v2Layout, v2AgentNote, v2SessionTitle, v2DocDone } = useChatStore()
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
      await runStreaming(
        { setMessageStage, setMessagePartial, setMessagePlan, addMessageFinding, resolveMessage, rejectMessage, v2SectionStart, v2CellComplete, v2CellUpdate, v2Layout, v2AgentNote, v2SessionTitle, v2DocDone },
        resolvedSession, loadingId,
        { prompt, session_id: resolvedSession, connection_id: activeConnectionId },
        getSignal(),
      )
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
