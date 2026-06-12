import { create } from "zustand"
import type { AnswerCell, AnswerDocument, AnswerSection, AgentNote, QueryResult } from "@/types"

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

// ── Agent feed (drives companion panel "Ran: X" live rows) ────────────────────

export type AgentFeedItem =
  | { t: "question"; sectionId: string; text: string }
  | { t: "note"; sectionId: string; text: string; kind: string }
  | { t: "cell"; sectionId: string; cellId: string; name: string; kind: string; status: "running" | "complete" | "error" }
  | { t: "layout"; sectionId: string }
  | { t: "completion"; sectionId: string; text: string }

// ── Thread message ────────────────────────────────────────────────────────────

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
  stage?: string
  partial?: Partial<QueryResult>
  plan?: StreamPlan
  findings?: StreamFinding[]
  createdAt: Date
  // v2 document model
  document?: AnswerDocument
  sessionTitle?: string
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
  sessionTitles: Record<string, string>
  agentFeeds: Record<string, AgentFeedItem[]>  // sessionId → live event feed for companion panel

  addUserMessage: (sessionId: string, prompt: string) => string
  addLoadingMessage: (sessionId: string) => string
  removeMessage: (sessionId: string, id: string) => void
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
  resolvePanelAssistantFromStream: (sessionId: string, text: string) => void
  // v2 document reducers
  v2SectionStart: (sessionId: string, tempId: string, sectionId: string, question: string) => void
  v2CellStart: (sessionId: string, tempId: string, cellId: string, name: string, kind: string, sectionId: string) => void
  v2CellComplete: (sessionId: string, tempId: string, cell: AnswerCell) => void
  v2CellUpdate: (sessionId: string, tempId: string, cell: AnswerCell) => void
  v2Layout: (sessionId: string, tempId: string, sectionId: string, order: string[]) => void
  v2AgentNote: (sessionId: string, tempId: string, sectionId: string, note: AgentNote) => void
  v2SessionTitle: (sessionId: string, title: string) => void
  v2DocDone: (sessionId: string, tempId: string, sectionId: string, followUps: string[], completionText: string | null) => void
}

let _counter = 0
const tempId = () => `tmp_${Date.now()}_${++_counter}`

// ── v2 document helpers ───────────────────────────────────────────────────────

function _updateSection(
  doc: AnswerDocument,
  sectionId: string,
  updater: (sec: AnswerSection) => AnswerSection,
): AnswerDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => (s.id === sectionId ? updater(s) : s)),
  }
}

function _updateMessageDoc(
  messages: ThreadMessage[],
  tempId: string,
  updater: (doc: AnswerDocument) => AnswerDocument,
): ThreadMessage[] {
  return messages.map((m) => {
    if (m.id !== tempId) return m
    const doc = m.document ?? { sections: [] }
    return { ...m, document: updater(doc) }
  })
}

function _appendFeed(feeds: Record<string, AgentFeedItem[]>, sessionId: string, item: AgentFeedItem): Record<string, AgentFeedItem[]> {
  return { ...feeds, [sessionId]: [...(feeds[sessionId] ?? []), item] }
}

export const useChatStore = create<ChatState>((set) => ({
  threads: {},
  panelMessages: {},
  sessionTitles: {},
  agentFeeds: {},

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

  removeMessage: (sessionId, id) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).filter((m) => m.id !== id),
      },
    }))
  },

  resolveMessage: (sessionId, tempId, result) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) => {
          if (m.id !== tempId) return m
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
          m.id === tempId
            ? { ...m, loading: false, stage: undefined, partial: undefined, plan: undefined, findings: undefined, error, errorType, errorDetail, retryPrompt: retryPrompt ?? null }
            : m
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
      const { [from]: _removedT, ...restT } = s.threads
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [from]: _removedF, ...restF } = s.agentFeeds
      return {
        threads: { ...restT, [to]: [...(restT[to] ?? []), ...msgs] },
        agentFeeds: { ...restF, [to]: [...(restF[to] ?? []), ...(s.agentFeeds[from] ?? [])] },
      }
    })
  },

  clearThread: (sessionId) => {
    set((s) => ({
      threads: { ...s.threads, [sessionId]: [] },
      agentFeeds: { ...s.agentFeeds, [sessionId]: [] },
    }))
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

  // Fill the pending panel loading bubble from the panel_message SSE event.
  // The SSE event is the source of truth — no post-stream fallback hack.
  resolvePanelAssistantFromStream: (sessionId, text) => {
    set((s) => {
      const thread = s.panelMessages[sessionId] ?? []
      const pending = [...thread].reverse().find((m) => m.role === "assistant" && m.loading)
      if (pending) {
        return {
          panelMessages: {
            ...s.panelMessages,
            [sessionId]: thread.map((m) => (m.id === pending.id ? { ...m, loading: false, text } : m)),
          },
        }
      }
      // No pending bubble — append a fresh assistant message.
      return {
        panelMessages: {
          ...s.panelMessages,
          [sessionId]: [...thread, { id: tempId(), role: "assistant" as const, text, createdAt: new Date() }],
        },
      }
    })
  },

  // ── v2 document reducers ──────────────────────────────────────────────────

  v2SectionStart: (sessionId, tempId, sectionId, question) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: _updateMessageDoc(s.threads[sessionId] ?? [], tempId, (doc) => ({
          ...doc,
          sections: [...doc.sections, { id: sectionId, question, cells: [], agent_notes: [] }],
        })),
      },
      agentFeeds: _appendFeed(s.agentFeeds, sessionId, { t: "question", sectionId, text: question }),
    }))
  },

  v2CellStart: (sessionId, _tempId, cellId, name, kind, sectionId) => {
    set((s) => ({
      agentFeeds: _appendFeed(s.agentFeeds, sessionId, { t: "cell", sectionId, cellId, name, kind, status: "running" }),
    }))
  },

  v2CellComplete: (sessionId, tempId, cell) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: _updateMessageDoc(s.threads[sessionId] ?? [], tempId, (doc) =>
          _updateSection(doc, cell.section_id, (sec) => ({
            ...sec,
            cells: sec.cells.some((c) => c.id === cell.id)
              ? sec.cells.map((c) => (c.id === cell.id ? cell : c))
              : [...sec.cells, cell],
          }))
        ),
      },
      agentFeeds: {
        ...s.agentFeeds,
        [sessionId]: (s.agentFeeds[sessionId] ?? []).map((item) =>
          item.t === "cell" && item.cellId === cell.id
            ? { ...item, status: "complete" as const }
            : item
        ),
      },
    }))
  },

  v2CellUpdate: (sessionId, _tempId, cell) => {
    // REFINE replaces a cell by id wherever it lives — the cell may belong to a
    // PRIOR message (panel REFINE), not the streaming message. Search all
    // messages in the session and update the one that owns the cell.
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: (s.threads[sessionId] ?? []).map((m) => {
          if (!m.document?.sections?.some((sec) => sec.cells.some((c) => c.id === cell.id))) return m
          return {
            ...m,
            document: {
              ...m.document,
              sections: m.document.sections.map((sec) => ({
                ...sec,
                cells: sec.cells.map((c) => (c.id === cell.id ? cell : c)),
              })),
            },
          }
        }),
      },
    }))
  },

  v2Layout: (sessionId, tempId, sectionId, order) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: _updateMessageDoc(s.threads[sessionId] ?? [], tempId, (doc) =>
          _updateSection(doc, sectionId, (sec) => ({ ...sec, layout: order }))
        ),
      },
      agentFeeds: _appendFeed(s.agentFeeds, sessionId, { t: "layout", sectionId }),
    }))
  },

  v2AgentNote: (sessionId, tempId, sectionId, note) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: _updateMessageDoc(s.threads[sessionId] ?? [], tempId, (doc) =>
          _updateSection(doc, sectionId, (sec) => ({
            ...sec,
            agent_notes: [...(sec.agent_notes ?? []), note],
          }))
        ),
      },
      agentFeeds: _appendFeed(s.agentFeeds, sessionId, { t: "note", sectionId, text: note.text, kind: note.kind }),
    }))
  },

  v2SessionTitle: (sessionId, title) => {
    set((s) => ({
      sessionTitles: { ...s.sessionTitles, [sessionId]: title },
    }))
  },

  v2DocDone: (sessionId, tempId, sectionId, followUps, completionText) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [sessionId]: _updateMessageDoc(s.threads[sessionId] ?? [], tempId, (doc) => ({
          ...doc,
          follow_ups: followUps,
          completion_text: completionText,
        })),
      },
      agentFeeds: completionText
        ? _appendFeed(s.agentFeeds, sessionId, { t: "completion", sectionId, text: completionText })
        : s.agentFeeds,
    }))
  },
}))
