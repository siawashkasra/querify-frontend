import { create } from "zustand"
import type { QueryResult } from "@/types"

// ── progressive analytical streaming (plan → findings as they land → synthesis)
export interface StreamPlanItem {
  question: string
  role: "direct" | "context" | "comparison" | "driver" | "risk"
}

export interface StreamPlan {
  intent?: string
  summary?: string
  sub_questions: StreamPlanItem[]
}

export interface StreamFinding {
  index: number
  role: string
  question: string
  columns: string[]
  rows: unknown[]
  chart_config?: import("@/types").ChartConfig | null
  error?: string | null
}

export interface ThreadMessage {
  id: string
  role: "user" | "assistant"
  prompt?: string
  result?: QueryResult
  error?: string
  errorType?: string | null
  errorDetail?: string | null
  retryPrompt?: string | null
  loading?: boolean
  stage?: string                       // live pipeline stage text while streaming
  partial?: Partial<QueryResult>       // Stage-1 (chart/number) before the analysis arrives
  plan?: StreamPlan                    // the streamed analysis plan (analytical path)
  findings?: StreamFinding[]           // sub-results, appended as each query completes
  createdAt: Date
}

export interface PanelMessage {
  id: string
  role: "user" | "assistant"
  text: string
  loading?: boolean
  error?: string
  createdAt: Date
}

interface ChatState {
  threads: Record<string, ThreadMessage[]>
  panelMessages: Record<string, PanelMessage[]>
  addUserMessage: (sessionId: string, prompt: string) => string
  addLoadingMessage: (sessionId: string) => string
  resolveMessage: (sessionId: string, tempId: string, result: QueryResult) => void
  rejectMessage: (sessionId: string, tempId: string, error: string, errorType?: string | null, errorDetail?: string | null, retryPrompt?: string | null) => void
  setMessageStage: (sessionId: string, tempId: string, stage: string) => void
  setMessagePartial: (sessionId: string, tempId: string, partial: Partial<QueryResult>) => void
  setMessagePlan: (sessionId: string, tempId: string, plan: StreamPlan) => void
  addMessageFinding: (sessionId: string, tempId: string, finding: StreamFinding) => void
  migrateThread: (from: string, to: string) => void
  clearThread: (sessionId: string) => void
  loadThread: (sessionId: string, messages: ThreadMessage[]) => void
  addPanelUserMessage: (sessionId: string, text: string) => string
  addPanelLoadingMessage: (sessionId: string) => string
  resolvePanelMessage: (sessionId: string, tempId: string, text: string) => void
  rejectPanelMessage: (sessionId: string, tempId: string, error: string) => void
}

let _counter = 0
const tempId = () => `tmp_${Date.now()}_${++_counter}`

export const useChatStore = create<ChatState>((set) => ({
  threads: {},
  panelMessages: {},

  addUserMessage: (sessionId, prompt) => {
    const id = tempId()
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: [...(s.threads[sessionId] ?? []), { id, role: "user", prompt, createdAt: new Date() }],
      },
    }))
    return id
  },

  addLoadingMessage: (sessionId) => {
    const id = tempId()
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: [...(s.threads[sessionId] ?? []), { id, role: "assistant", loading: true, createdAt: new Date() }],
      },
    }))
    return id
  },

  resolveMessage: (sessionId, tempId, result) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) => {
          if (m.id !== tempId) return m
          // §4 append-only streaming: an analytical answer (plan present)
          // KEEPS its streamed plan/findings/partial so the rendered blocks
          // upgrade IN PLACE — nothing already on screen is removed or redrawn.
          if (m.plan) return { ...m, loading: false, stage: undefined, result }
          return { ...m, loading: false, stage: undefined, partial: undefined, plan: undefined, findings: undefined, result }
        }),
      },
    }))
  },

  rejectMessage: (sessionId, tempId, error, errorType, errorDetail, retryPrompt) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, stage: undefined, partial: undefined, plan: undefined, findings: undefined, error, errorType, errorDetail, retryPrompt: retryPrompt ?? null } : m
        ),
      },
    }))
  },

  setMessageStage: (sessionId, tempId, stage) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) => (m.id === tempId ? { ...m, stage } : m)),
      },
    }))
  },

  setMessagePartial: (sessionId, tempId, partial) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, partial: { ...(m.partial ?? {}), ...partial } } : m
        ),
      },
    }))
  },

  setMessagePlan: (sessionId, tempId, plan) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) => (m.id === tempId ? { ...m, plan } : m)),
      },
    }))
  },

  addMessageFinding: (sessionId, tempId, finding) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId
            ? { ...m, findings: [...(m.findings ?? []).filter((f) => f.index !== finding.index), finding] }
            : m
        ),
      },
    }))
  },

  migrateThread: (from, to) => {
    set((s) => {
      const msgs = s.threads[from]
      if (!msgs?.length) return s
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [from]: _removed, ...rest } = s.threads
      return { threads: { ...rest, [to]: [...(rest[to] ?? []), ...msgs] } }
    })
  },

  clearThread: (sessionId) => {
    set((s) => ({ threads: { ...s.threads, [sessionId]: [] } }))
  },

  loadThread: (sessionId, messages) => {
    set((s) => ({ threads: { ...s.threads, [sessionId]: messages } }))
  },

  addPanelUserMessage: (sessionId, text) => {
    const id = tempId()
    set((s) => ({
      panelMessages: {
        ...s.panelMessages,
        [sessionId]: [...(s.panelMessages[sessionId] ?? []), { id, role: "user", text, createdAt: new Date() }],
      },
    }))
    return id
  },

  addPanelLoadingMessage: (sessionId) => {
    const id = tempId()
    set((s) => ({
      panelMessages: {
        ...s.panelMessages,
        [sessionId]: [...(s.panelMessages[sessionId] ?? []), { id, role: "assistant", text: "", loading: true, createdAt: new Date() }],
      },
    }))
    return id
  },

  resolvePanelMessage: (sessionId, tempId, text) => {
    set((s) => ({
      panelMessages: {
        ...s.panelMessages,
        [sessionId]: (s.panelMessages[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, text } : m
        ),
      },
    }))
  },

  rejectPanelMessage: (sessionId, tempId, error) => {
    set((s) => ({
      panelMessages: {
        ...s.panelMessages,
        [sessionId]: (s.panelMessages[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, error } : m
        ),
      },
    }))
  },
}))
