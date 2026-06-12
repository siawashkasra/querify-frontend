"use client"

import { use, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAppStore } from "@/store/appStore"
import { connections as connectionsApi, query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import type { ThreadMessage } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import { runStreaming } from "@/lib/runStreaming"
import { usePlan } from "@/hooks/usePlan"
import ChatHeader from "@/components/chat/ChatHeader"
import ChatCanvas from "@/components/chat/ChatCanvas"
import { Composer } from "@/components/chat/Composer"
import { CompanionPanel } from "@/components/chat/CompanionPanel"
import SchemaChangeBanner from "@/components/chat/SchemaChangeBanner"
import RefreshSuggestionBanner from "@/components/chat/RefreshSuggestionBanner"
import { UpgradePromptBanner } from "@/components/billing/UpgradePrompt"
import { useSessionTitle } from "@/hooks/useSessionTitle"
import type { ChatMessage, ChatSession, Connection } from "@/types"
import { cn } from "@/lib/cn"

interface ChatPageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = use(params)
  const router = useRouter()
  const qc = useQueryClient()
  const { activeConnectionId, setActiveConnection, setActiveSession, showRightPanel, toggleRightPanel, setRightPanel } = useAppStore()
  const {
    threads,
    panelMessages,
    sessionTitles,
    addUserMessage,
    addLoadingMessage,
    resolveMessage,
    rejectMessage,
    setMessageStage,
    setMessagePartial,
    setMessagePlan,
    addMessageFinding,
    loadThread,
    addPanelUserMessage,
    removeMessage,
    resolvePanelAssistantFromStream,
    v2SectionStart,
    v2CellStart,
    v2CellComplete,
    v2CellUpdate,
    v2Layout,
    v2AgentNote,
    v2SessionTitle,
    v2DocDone,
    agentFeeds,
  } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const plan = usePlan()
  const [loading, setLoading] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [usageWarning, setUsageWarning] = useState<{ pct: number } | null>(null)
  const [warningDismissed, setWarningDismissed] = useState(false)
  // Why a submit was blocked — surfaced under the composer, never a silent return.
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    function onWarning(e: Event) {
      const detail = (e as CustomEvent<{ pct: number }>).detail
      if (!warningDismissed && detail.pct >= 80) setUsageWarning(detail)
    }
    window.addEventListener("querify:usage-warning", onWarning)
    return () => window.removeEventListener("querify:usage-warning", onWarning)
  }, [warningDismissed])

  const { data: session, error: sessionError } = useQuery<ChatSession>({
    queryKey: ["session", sessionId],
    queryFn: () => queryApi.session(sessionId) as Promise<ChatSession>,
    staleTime: 60_000,
    retry: false,
  })

  // The connection a question runs against is the SESSION's connection — the
  // global app state is only a fallback (e.g. a brand-new session mid-create).
  const connectionId = session?.connection_id ?? activeConnectionId ?? null

  // Keep global state aligned with the session you're viewing so the rest of
  // the app (switcher, banners) reflects this session's connection.
  useEffect(() => {
    if (session?.connection_id && session.connection_id !== activeConnectionId) {
      setActiveConnection(session.connection_id)
    }
  }, [session?.connection_id, activeConnectionId, setActiveConnection])

  const { data: activeConn } = useQuery<Connection | null>({
    queryKey: ["connection", connectionId],
    queryFn: () =>
      connectionId ? (connectionsApi.get(connectionId) as Promise<Connection>) : Promise.resolve(null),
    enabled: !!connectionId,
    staleTime: 30_000,
  })

  // Never show "No connection" when the session actually has one — fall back to
  // a neutral label while the connection's name is still loading.
  const connectionLabel = activeConn?.name ?? (connectionId ? "Connected database" : undefined)

  // The session was deleted (or never existed) — don't strand the user on a
  // dead URL that would 404 every query. Bounce to a fresh chat.
  useEffect(() => {
    if (sessionError) router.replace("/chat/new")
  }, [sessionError, router])

  const hasLiveMessages = (threads[sessionId] ?? []).some((m) => m.loading === true)

  const { data: apiMessages } = useQuery<ChatMessage[]>({
    queryKey: ["session-messages", sessionId],
    queryFn: () => queryApi.history({ session_id: sessionId, limit: 100 }) as Promise<ChatMessage[]>,
    staleTime: 60_000,
    enabled: !hasLiveMessages,
  })

  // Hydrate store from API — converts flat ChatMessage[] → ThreadMessage[] pairs.
  // When answer_document is present, attach it as `document` for SessionCanvas.
  useEffect(() => {
    if (!apiMessages?.length || hasLiveMessages) return
    const localThread = useChatStore.getState().threads[sessionId]
    if (localThread && localThread.length > 0) return
    const chronological = [...apiMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const hydrated = chronological.flatMap((m): ThreadMessage[] => {
      const userMsg: ThreadMessage = {
        id: `${m.id}-user`,
        role: "user",
        prompt: m.prompt,
        createdAt: new Date(m.created_at),
      }
      const assistantMsg: ThreadMessage = {
        id: m.id,
        role: "assistant",
        createdAt: new Date(m.created_at),
        // v2: rehydrate document from answer_document if present
        document: m.answer_document ?? undefined,
        ...(m.status === "failed" || m.error_type
          ? { error: m.error_message ?? "Query failed.", errorType: m.error_type, errorDetail: m.error_message }
          : {
              result: {
                message_id: m.id,
                status: m.status,
                summary: m.result_summary,
                sql: m.sql_generated,
                chart_config: m.chart_config,
                kpi_cards: m.kpi_cards ?? [],
                columns: m.result_columns ?? [],
                rows: m.result_preview?.rows ?? [],
                assumptions: m.assumptions ?? [],
                error_type: m.error_type,
                message: m.error_message,
                suggestions: [],
                execution_ms: m.execution_ms,
                total_ms: m.total_response_ms ?? null,
                feedback_score: m.feedback_score === 1 || m.feedback_score === -1 ? m.feedback_score : null,
                confidence_score: m.confidence_score ?? null,
                confidence_level: m.confidence_level ?? null,
                confidence_factors: m.confidence_factors ?? [],
                confidence_caveats: m.confidence_caveats ?? [],
              },
            }),
      }
      return [userMsg, assistantMsg]
    })
    loadThread(sessionId, hydrated)
  }, [apiMessages, sessionId, hasLiveMessages, loadThread])

  useEffect(() => {
    setActiveSession(sessionId)
  }, [sessionId, setActiveSession])

  const messages = threads[sessionId] ?? []
  const currentPanelMessages = panelMessages[sessionId] ?? []
  const liveTitle = useSessionTitle(sessionId, session?.title)

  // agentFeed for companion panel
  const currentAgentFeed = agentFeeds[sessionId] ?? []

  // Cells available for @mention + follow-up suggestions, derived from the
  // latest assistant message's document.
  const latestDoc = [...messages].reverse().find((m) => m.role === "assistant" && m.document)?.document
  const mentionCells = (latestDoc?.sections ?? []).flatMap((s) =>
    s.cells.map((c) => ({ name: c.name, kind: c.kind }))
  )
  const panelFollowUps = latestDoc?.follow_ups ?? []

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (loading) { setSubmitError("Still answering your last question — hold on a moment."); return }
      if (!connectionId) { setSubmitError("This chat isn't linked to a database connection. Pick a connection to ask a question."); return }
      setSubmitError(null)
      setLoading(true)
      addUserMessage(sessionId, prompt)
      const loadingId = addLoadingMessage(sessionId)
      try {
        await runStreaming(
          {
            setMessageStage, setMessagePartial, setMessagePlan, addMessageFinding,
            resolveMessage, rejectMessage,
            v2SectionStart, v2CellStart, v2CellComplete, v2CellUpdate, v2Layout, v2AgentNote, v2SessionTitle, v2DocDone,
          },
          sessionId, loadingId,
          { prompt, session_id: sessionId, connection_id: connectionId },
          getSignal(),
        )
        qc.invalidateQueries({ queryKey: ["session-messages", sessionId] })
        qc.invalidateQueries({ queryKey: ["sessions"] })
      } catch (err: unknown) {
        const apiErr = err as { message?: string } | null
        setSubmitError(apiErr?.message ?? "Something went wrong running that query. Try again.")
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionId, sessionId, loading]
  )

  const handlePanelSubmit = useCallback(
    async (text: string) => {
      if (!connectionId) { setSubmitError("This chat isn't linked to a database connection. Pick a connection to ask a question."); return }
      setSubmitError(null)
      // A QUICK answer must never be invisible — open the panel before it streams.
      setRightPanel(true)
      setPanelLoading(true)
      addPanelUserMessage(sessionId, text)
      // A canvas loading message so an EXTEND/REFINE from the panel renders on
      // the canvas. QUICK produces no canvas content — we drop it afterward.
      const canvasLoadingId = addLoadingMessage(sessionId)
      // Parse @mentions from the text and resolve to known cells.
      const mentionNames = Array.from(text.matchAll(/@([A-Za-z0-9_\-]+)/g)).map((m) => m[1])
      const mentions = mentionNames
        .map((n) => mentionCells.find((c) => c.name.toLowerCase() === n.toLowerCase())?.name)
        .filter((name): name is string => Boolean(name))
        .map((name) => ({ name }))
      try {
        await runStreaming(
          {
            setMessageStage, setMessagePartial, setMessagePlan, addMessageFinding,
            resolveMessage, rejectMessage,
            v2SectionStart, v2CellStart, v2CellComplete, v2CellUpdate, v2Layout, v2AgentNote, v2SessionTitle, v2DocDone,
            resolvePanelAssistantFromStream,
          },
          sessionId, canvasLoadingId,
          { prompt: text, session_id: sessionId, connection_id: connectionId, panel_mode: true, mentions },
          getSignal(),
        )
        // QUICK/REFINE produce no new canvas section — discard the empty
        // canvas message so it never renders a blank card.
        const msg = useChatStore.getState().threads[sessionId]?.find((m) => m.id === canvasLoadingId)
        if (!msg?.document?.sections?.length) removeMessage(sessionId, canvasLoadingId)
        qc.invalidateQueries({ queryKey: ["sessions"] })
      } catch (err: unknown) {
        const apiErr = err as { message?: string } | null
        resolvePanelAssistantFromStream(sessionId, apiErr?.message ?? "Query failed.")
        removeMessage(sessionId, canvasLoadingId)
      } finally {
        setPanelLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connectionId, sessionId, mentionCells]
  )

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Banners */}
      {usageWarning && !warningDismissed && plan.queryLimit !== null && (
        <UpgradePromptBanner
          usagePct={usageWarning.pct}
          queriesUsed={plan.queriesUsed}
          queryLimit={plan.queryLimit}
          nextPlan="Starter"
          periodEnd={plan.periodEnd}
          onDismiss={() => setWarningDismissed(true)}
        />
      )}
      {activeConn?.pending_schema_diff?.has_changes && (
        <SchemaChangeBanner connectionId={activeConn.id} diff={activeConn.pending_schema_diff} />
      )}
      {activeConn && !activeConn.pending_schema_diff?.has_changes && (
        <RefreshSuggestionBanner connection={activeConn} />
      )}

      <ChatHeader
        sessionTitle={sessionTitles[sessionId] ?? session?.title ?? null}
        onTitleChange={(t) => {
          v2SessionTitle(sessionId, t)
          queryApi.updateSession(sessionId, { title: t, user_renamed: true }).catch(() => { /* ignore */ })
        }}
      />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Canvas column */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {hasMessages ? (
            <ChatCanvas
              messages={messages}
              connectionName={connectionLabel}
              connectionId={connectionId}
              onFollowUp={handleSubmit}
              onRetry={handleSubmit}
            />
          ) : null}

          <Composer
            onSubmit={handleSubmit}
            isLoading={loading}
            hasContent={hasMessages}
            connectionName={connectionLabel}
            errorMessage={submitError}
          />
        </div>

        {/* Companion panel */}
        <div className="relative hidden md:flex shrink-0">
          <button
            onClick={toggleRightPanel}
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20",
              "flex items-center justify-center w-6 h-6 rounded-full",
              "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700",
              "shadow-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150"
            )}
            title={showRightPanel ? "Close panel" : "Open panel"}
          >
            <span className="text-[10px] text-gray-500">{showRightPanel ? "›" : "‹"}</span>
          </button>

          {showRightPanel && (
            <CompanionPanel
              agentFeed={currentAgentFeed}
              panelMessages={currentPanelMessages}
              onPanelMessage={handlePanelSubmit}
              isLoading={panelLoading}
              cells={mentionCells}
              followUps={panelFollowUps}
              onRetry={handleSubmit}
              className="w-72 md:w-[340px]"
            />
          )}
        </div>
      </div>
    </div>
  )
}
