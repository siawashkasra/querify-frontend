import { create } from "zustand"
import type { QueryResult } from "@/types"

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
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, stage: undefined, partial: undefined, result } : m
        ),
      },
    }))
  },

  rejectMessage: (sessionId, tempId, error, errorType, errorDetail, retryPrompt) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, stage: undefined, partial: undefined, error, errorType, errorDetail, retryPrompt: retryPrompt ?? null } : m
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
