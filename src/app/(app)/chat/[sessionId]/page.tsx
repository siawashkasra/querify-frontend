"use client"

import { use, useEffect, useState, useCallback, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useAppStore } from "@/store/appStore"
import { connections as connectionsApi, query as queryApi } from "@/lib/api"
import { useChatStore } from "@/store/chatStore"
import type { ThreadMessage } from "@/store/chatStore"
import { useAbortController } from "@/hooks/useAbortController"
import { usePlan } from "@/hooks/usePlan"
import { useSuggestedQuestions } from "@/hooks/useSuggestedQuestions"
import ChatHeader from "@/components/chat/ChatHeader"
import MessageThread from "@/components/chat/MessageThread"
import RightPanel from "@/components/chat/RightPanel"
import CentredPromptInput from "@/components/chat/CentredPromptInput"
import BottomPromptInput, { type BottomPromptInputHandle } from "@/components/chat/BottomPromptInput"
import SchemaChangeBanner from "@/components/chat/SchemaChangeBanner"
import RefreshSuggestionBanner from "@/components/chat/RefreshSuggestionBanner"
import { UpgradePromptBanner } from "@/components/billing/UpgradePrompt"
import type { ChatMessage, ChatSession, Connection, QueryResult } from "@/types"
import { cn } from "@/lib/cn"

interface ChatPageProps {
  params: Promise<{ sessionId: string }>
}

export default function ChatPage({ params }: ChatPageProps) {
  const { sessionId } = use(params)
  const qc = useQueryClient()
  const { activeConnectionId, setActiveSession, showRightPanel, toggleRightPanel } = useAppStore()
  const {
    threads,
    panelMessages,
    addUserMessage,
    addLoadingMessage,
    resolveMessage,
    rejectMessage,
    loadThread,
    addPanelUserMessage,
    addPanelLoadingMessage,
    resolvePanelMessage,
    rejectPanelMessage,
  } = useChatStore()
  const { getSignal, cancel } = useAbortController()
  const plan = usePlan()
  const [loading, setLoading] = useState(false)
  const [panelLoading, setPanelLoading] = useState(false)
  const [sessionTitle, setSessionTitle] = useState<string | null>(null)
  const [usageWarning, setUsageWarning] = useState<{ pct: number } | null>(null)
  const [warningDismissed, setWarningDismissed] = useState(false)
  const inputRef = useRef<BottomPromptInputHandle>(null)

  useEffect(() => {
    function onWarning(e: Event) {
      const detail = (e as CustomEvent<{ pct: number }>).detail
      if (!warningDismissed && detail.pct >= 80) setUsageWarning(detail)
    }
    window.addEventListener("querify:usage-warning", onWarning)
    return () => window.removeEventListener("querify:usage-warning", onWarning)
  }, [warningDismissed])

  const { data: activeConn } = useQuery<Connection | null>({
    queryKey: ["connection", activeConnectionId],
    queryFn: () =>
      activeConnectionId ? (connectionsApi.get(activeConnectionId) as Promise<Connection>) : Promise.resolve(null),
    enabled: !!activeConnectionId,
    staleTime: 30_000,
  })

  const { data: session } = useQuery<ChatSession>({
    queryKey: ["session", sessionId],
    queryFn: () => queryApi.session(sessionId) as Promise<ChatSession>,
    staleTime: 60_000,
  })

  const hasLiveMessages = (threads[sessionId] ?? []).some((m) => m.loading === true)

  const { data: apiMessages } = useQuery<ChatMessage[]>({
    queryKey: ["session-messages", sessionId],
    queryFn: () => queryApi.history({ session_id: sessionId, limit: 100 }) as Promise<ChatMessage[]>,
    staleTime: 60_000,
    enabled: !hasLiveMessages,
  })

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
    if (session?.title) setSessionTitle(session.title)
  }, [sessionId, session, setActiveSession])

  const messages = threads[sessionId] ?? []
  const currentPanelMessages = panelMessages[sessionId] ?? []
  const recentAssistantMessage = [...messages].reverse().find((m) => m.role === "assistant") ?? null
  const currentResult = recentAssistantMessage?.result
  const { suggestions, isLoading: suggestionsLoading } = useSuggestedQuestions(activeConnectionId)

  const handleSubmit = useCallback(
    async (prompt: string) => {
      if (!activeConnectionId) return
      setLoading(true)
      addUserMessage(sessionId, prompt)
      const loadingId = addLoadingMessage(sessionId)
      try {
        const signal = getSignal()
        const result = (await queryApi.execute(
          { prompt, session_id: sessionId, connection_id: activeConnectionId },
          signal
        )) as QueryResult
        if (result.status === "failed" || result.status === "timeout") {
          rejectMessage(sessionId, loadingId, result.message ?? "Query failed.", result.error_type ?? null, result.message ?? null)
        } else {
          resolveMessage(sessionId, loadingId, result)
        }
        qc.invalidateQueries({ queryKey: ["session-messages", sessionId] })
        qc.invalidateQueries({ queryKey: ["sessions"] })
        if (!sessionTitle) setSessionTitle(prompt.slice(0, 40))
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === "AbortError"
        const apiErr = err as { error_type?: string; message?: string } | null
        const message = isAbort ? "Query cancelled." : (apiErr?.message ?? "Query failed.")
        const errorType = isAbort ? null : (apiErr?.error_type ?? null)
        rejectMessage(sessionId, loadingId, message, errorType, message)
      } finally {
        setLoading(false)
      }
    },
    [activeConnectionId, sessionId, sessionTitle, addUserMessage, addLoadingMessage, resolveMessage, rejectMessage, getSignal, qc]
  )

  const handlePanelSubmit = useCallback(
    async (text: string) => {
      if (!activeConnectionId) return
      setPanelLoading(true)
      addPanelUserMessage(sessionId, text)
      const loadingId = addPanelLoadingMessage(sessionId)
      try {
        const result = (await queryApi.execute(
          { prompt: text, session_id: sessionId, connection_id: activeConnectionId },
          undefined
        )) as QueryResult
        const responseText =
          result.summary ||
          result.analytical_narrative?.split("\n\n")[0] ||
          (result.status === "failed" ? (result.message ?? "Query failed.") : "Done.")
        resolvePanelMessage(sessionId, loadingId, responseText ?? "Done.")
      } catch (err: unknown) {
        const apiErr = err as { message?: string } | null
        rejectPanelMessage(sessionId, loadingId, apiErr?.message ?? "Query failed.")
      } finally {
        setPanelLoading(false)
      }
    },
    [activeConnectionId, sessionId, addPanelUserMessage, addPanelLoadingMessage, resolvePanelMessage, rejectPanelMessage]
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

      {!hasMessages ? (
        /* ── EMPTY STATE ── */
        <div className="flex flex-col items-center justify-center flex-1 px-6 py-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-[var(--text)] mb-2">What would you like to know?</h1>
            {activeConn
              ? <p className="text-sm text-[var(--text-muted)]">Connected to <span className="font-medium text-[var(--text-dim)]">{activeConn.name}</span></p>
              : <p className="text-sm text-[var(--text-muted)]">Select a connection to get started</p>
            }
          </div>
          <div className="w-full max-w-2xl">
            <CentredPromptInput
              onSubmit={handleSubmit}
              isLoading={loading}
              connectionName={activeConn?.name}
              dbType={activeConn?.db_type}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-6 justify-center max-w-2xl">
            {suggestionsLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 w-40 rounded-full animate-pulse bg-[var(--surface-3)]" />
                ))
              : suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s.question}
                    onClick={() => handleSubmit(s.question)}
                    disabled={loading || !activeConnectionId}
                    className="px-4 py-2 rounded-full text-sm bg-white border border-[var(--border)] text-[var(--text-dim)] hover:border-brand hover:text-brand transition-colors disabled:opacity-40"
                  >
                    {s.question}
                  </button>
                ))
            }
          </div>
        </div>
      ) : (
        /* ── ACTIVE LAYOUT: [chat] + [right panel] ── */
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* LEFT: Chat column */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <ChatHeader
              sessionTitle={sessionTitle ?? session?.title ?? null}
              onTitleChange={setSessionTitle}
            />
            {/* Thread — direct flex child so its own overflow-y-auto is the sole scroll container */}
            <MessageThread
              messages={messages}
              connectionName={activeConn?.name}
              onFollowUp={() => inputRef.current?.focus()}
              onRetry={handleSubmit}
              onSuggestedQuestion={handleSubmit}
            />
            <BottomPromptInput
              ref={inputRef}
              onSubmit={handleSubmit}
              onCancel={cancel}
              loading={loading}
              disabled={!activeConnectionId}
            />
          </div>

          {/* RIGHT: Panel area — relative so edge toggle can float */}
          <div className="relative hidden md:flex shrink-0">
            {/* Edge toggle button — always visible on panel left edge */}
            <button
              onClick={toggleRightPanel}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20",
                "flex items-center justify-center w-6 h-6 rounded-full",
                "bg-[var(--surface-2)] border border-[var(--border-2)]",
                "shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
                "hover:bg-[var(--surface-3)] transition-all duration-150"
              )}
              title={showRightPanel ? "Close analysis panel" : "Open analysis panel"}
            >
              {showRightPanel
                ? <ChevronRight size={10} className="text-[var(--text-dim)]" />
                : <ChevronLeft size={10} className="text-[var(--text-dim)]" />
              }
            </button>

            {/* Panel content */}
            {showRightPanel && (
              <RightPanel
                recentMessage={recentAssistantMessage}
                panelMessages={currentPanelMessages}
                onPanelSubmit={handlePanelSubmit}
                isPanelLoading={panelLoading}
                isVisible={showRightPanel}
                onToggle={toggleRightPanel}
                sessionTitle={sessionTitle ?? session?.title ?? null}
                connectionName={activeConn?.name}
                currentResult={currentResult}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
