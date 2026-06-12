"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { query as queryApi } from "@/lib/api"
import type { ChatSession } from "@/types"
import { useChatStore } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import { runStreaming } from "@/lib/runStreaming"
import SessionSidebar from "@/components/chat/SessionSidebar"
import ChatHeader from "@/components/chat/ChatHeader"
import ChatCanvas from "@/components/chat/ChatCanvas"
import { Composer } from "@/components/chat/Composer"

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
  const {
    threads,
    addUserMessage,
    addLoadingMessage,
    resolveMessage,
    rejectMessage,
    setMessageStage,
    setMessagePartial,
    setMessagePlan,
    addMessageFinding,
    migrateThread,
    v2SectionStart,
    v2CellStart,
    v2CellComplete,
    v2CellUpdate,
    v2Layout,
    v2AgentNote,
    v2SessionTitle,
    v2DocDone,
  } = useChatStore()
  const { getSignal } = useAbortController()
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const autoSubmitDone = useRef(false)

  const { data: recentSessions } = useQuery<ChatSession[]>({
    queryKey: ["sessions", activeConnectionId],
    queryFn: () => queryApi.sessions(activeConnectionId ?? undefined) as Promise<ChatSession[]>,
    staleTime: 30_000,
  })

  // Draft param — pre-fill composer (not auto-submitted)
  const draftParam = searchParams.get("draft") ?? undefined

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
        {
          setMessageStage, setMessagePartial, setMessagePlan, addMessageFinding,
          resolveMessage, rejectMessage,
          v2SectionStart, v2CellStart, v2CellComplete, v2CellUpdate, v2Layout, v2AgentNote, v2SessionTitle, v2DocDone,
        },
        resolvedSession, loadingId,
        { prompt, session_id: resolvedSession, connection_id: activeConnectionId },
        getSignal(),
      )
    } finally {
      setLoading(false)
    }
  }

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

  const hasMessages = messages.length > 0

  return (
    <div className="flex h-full">
      <SessionSidebar />
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <ChatHeader sessionTitle={null} />

        {hasMessages && (
          <ChatCanvas
            messages={messages}
            connectionId={activeConnectionId ?? searchParams.get("connection")}
            onFollowUp={handleSubmit}
            onRetry={handleSubmit}
          />
        )}

        <Composer
          onSubmit={handleSubmit}
          isLoading={loading}
          hasContent={hasMessages}
          initialValue={draftParam}
          recentSessions={recentSessions?.slice(0, 6).map((s) => ({ id: s.id, title: s.title ?? "Untitled", intent: s.dominant_intent }))}
          onJumpBack={(id) => router.push(`/chat/${id}`)}
        />
      </div>
    </div>
  )
}
