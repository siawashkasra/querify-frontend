import { create } from "zustand"
import type { QueryResult } from "@/types"

export interface ThreadMessage {
  id: string
  role: "user" | "assistant"
  prompt?: string
  result?: QueryResult
  error?: string
  loading?: boolean
  createdAt: Date
}

interface ChatState {
  threads: Record<string, ThreadMessage[]>
  addUserMessage: (sessionId: string, prompt: string) => string
  addLoadingMessage: (sessionId: string) => string
  resolveMessage: (sessionId: string, tempId: string, result: QueryResult) => void
  rejectMessage: (sessionId: string, tempId: string, error: string) => void
  clearThread: (sessionId: string) => void
}

let _counter = 0
const tempId = () => `tmp_${Date.now()}_${++_counter}`

export const useChatStore = create<ChatState>((set) => ({
  threads: {},

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
          m.id === tempId ? { ...m, loading: false, result } : m
        ),
      },
    }))
  },

  rejectMessage: (sessionId, tempId, error) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) =>
          m.id === tempId ? { ...m, loading: false, error } : m
        ),
      },
    }))
  },

  clearThread: (sessionId) => {
    set((s) => ({ threads: { ...s.threads, [sessionId]: [] } }))
  },
}))
