// Drives a streaming query into the chat store: live stage text, a Stage-1
// progressive result (chart/number), then the Stage-2 analysis, then the final
// result (or an actionable error with a retry prompt).
import { streamQuery, type StreamEvent } from "@/lib/streamQuery"
import type { QueryResult } from "@/types"

interface StoreActions {
  setMessageStage: (sessionId: string, id: string, stage: string) => void
  setMessagePartial: (sessionId: string, id: string, partial: Partial<QueryResult>) => void
  resolveMessage: (sessionId: string, id: string, result: QueryResult) => void
  rejectMessage: (sessionId: string, id: string, error: string, errorType?: string | null, errorDetail?: string | null, retryPrompt?: string | null) => void
}

export async function runStreaming(
  store: StoreActions,
  sessionId: string,
  loadingId: string,
  body: { prompt: string; connection_id: string; session_id?: string },
  signal?: AbortSignal,
): Promise<void> {
  let final: StreamEvent | null = null
  try {
    await streamQuery(body, (e) => {
      switch (e.type) {
        case "stage":
          store.setMessageStage(sessionId, loadingId, String(e.message ?? ""))
          break
        case "result":
          store.setMessagePartial(sessionId, loadingId, {
            columns: e.columns as string[], rows: e.rows as unknown[],
            chart_config: e.chart_config as QueryResult["chart_config"], kpi_cards: (e.kpi_cards ?? []) as QueryResult["kpi_cards"],
          })
          break
        case "analysis":
          store.setMessagePartial(sessionId, loadingId, {
            headline: e.headline as string, summary: e.summary as string,
            insights: (e.insights ?? []) as string[], blocks: (e.blocks ?? []) as QueryResult["blocks"],
            follow_ups: (e.follow_ups ?? []) as string[],
          })
          break
        case "done":
          final = e
          break
        case "error":
          final = { ...e, status: "failed" }
          break
      }
    }, signal)

    if (final) {
      const r = final as unknown as QueryResult
      if (r.status === "failed" || r.status === "timeout") {
        store.rejectMessage(sessionId, loadingId, r.message ?? "Query failed.", r.error_type ?? null, r.message ?? null, r.retry_prompt ?? null)
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
