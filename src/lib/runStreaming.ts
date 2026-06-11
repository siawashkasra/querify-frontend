import { streamQuery } from "@/lib/streamQuery"
import type { StreamFinding, StreamPlan } from "@/store/chatStore"
import type { AgentNote, AnswerCell, QueryResult } from "@/types"

interface StoreActions {
  setMessageStage: (sessionId: string, id: string, stage: string) => void
  setMessagePartial: (sessionId: string, id: string, partial: Partial<QueryResult>) => void
  setMessagePlan: (sessionId: string, id: string, plan: StreamPlan) => void
  addMessageFinding: (sessionId: string, id: string, finding: StreamFinding) => void
  resolveMessage: (sessionId: string, id: string, result: QueryResult) => void
  rejectMessage: (sessionId: string, id: string, error: string, errorType?: string | null, errorDetail?: string | null, retryPrompt?: string | null) => void
  // v2 reducers
  v2SectionStart: (sessionId: string, id: string, sectionId: string, question: string) => void
  v2CellStart: (sessionId: string, id: string, cellId: string, name: string, kind: string, sectionId: string) => void
  v2CellComplete: (sessionId: string, id: string, cell: AnswerCell) => void
  v2CellUpdate: (sessionId: string, id: string, cell: AnswerCell) => void
  v2Layout: (sessionId: string, id: string, sectionId: string, order: string[]) => void
  v2AgentNote: (sessionId: string, id: string, sectionId: string, note: AgentNote) => void
  v2SessionTitle: (sessionId: string, title: string) => void
  v2DocDone: (sessionId: string, id: string, sectionId: string, followUps: string[], completionText: string | null) => void
}

export async function runStreaming(
  store: StoreActions,
  sessionId: string,
  loadingId: string,
  body: { prompt: string; connection_id: string; session_id?: string },
  signal?: AbortSignal,
): Promise<void> {
  let final = null as unknown as import("@/lib/streamQuery").StreamEvent | null
  try {
    await streamQuery(body, (e) => {
      switch (e.type) {
        case "stage":
          store.setMessageStage(sessionId, loadingId, String(e.message ?? ""))
          break
        case "result":
          store.setMessagePartial(sessionId, loadingId, {
            columns: e.columns as string[], rows: e.rows as unknown[],
            chart_config: e.chart_config as QueryResult["chart_config"],
            kpi_cards: (e.kpi_cards ?? []) as QueryResult["kpi_cards"],
          })
          break
        case "done":
          final = e
          break
        case "error":
          final = { ...e, status: "failed" }
          break
        // ── v2 events (protocol_version=2) ─────────────────────────────────
        case "section_start":
          if (e.protocol_version === 2)
            store.v2SectionStart(sessionId, loadingId, e.section_id as string, e.question as string)
          break
        case "cell_start":
          if (e.protocol_version === 2)
            store.v2CellStart(
              sessionId, loadingId,
              e.id as string,
              e.name as string,
              e.kind as string,
              e.section_id as string,
            )
          break
        case "cell_complete":
          if (e.protocol_version === 2)
            store.v2CellComplete(sessionId, loadingId, e.cell as AnswerCell)
          break
        case "cell_update":
          if (e.protocol_version === 2)
            store.v2CellUpdate(sessionId, loadingId, e.cell as AnswerCell)
          break
        case "layout":
          if (e.protocol_version === 2)
            store.v2Layout(sessionId, loadingId, e.section_id as string, (e.order ?? []) as string[])
          break
        case "agent_note":
          if (e.protocol_version === 2)
            store.v2AgentNote(sessionId, loadingId, e.section_id as string, { kind: e.kind, text: e.text } as AgentNote)
          break
        case "session_title":
          if (e.protocol_version === 2)
            store.v2SessionTitle(sessionId, e.title as string)
          break
        case "doc_done":
          if (e.protocol_version === 2)
            store.v2DocDone(
              sessionId, loadingId,
              (e.section_id ?? "") as string,
              (e.follow_ups ?? []) as string[],
              (e.completion_text ?? null) as string | null,
            )
          break
      }
    }, signal)

    if (final) {
      const r = final as unknown as QueryResult
      if (r.status === "failed" || r.status === "timeout") {
        store.rejectMessage(sessionId, loadingId, r.message ?? "Query failed.", r.error_type ?? null, r.message ?? null, (r as unknown as Record<string, unknown>).retry_prompt as string ?? null)
      } else {
        store.resolveMessage(sessionId, loadingId, r)
      }
    } else {
      store.rejectMessage(sessionId, loadingId, "Query failed.")
    }
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === "AbortError"
    store.rejectMessage(sessionId, loadingId, isAbort ? "Query cancelled." : "Query failed.")
  }
}
