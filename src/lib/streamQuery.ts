// Streaming query client — POSTs to /api/v1/query/stream and parses the SSE
// event stream (stage / result / analysis / done / error). Uses fetch (not
// axios/EventSource) so we can send the Bearer token AND abort mid-flight; the
// abort disconnects the server, which cancels the in-flight DB query.
import { useAuthStore } from "@/store/authStore"

export interface StreamEvent {
  type: "stage" | "result" | "analysis" | "done" | "error" | "cancelled"
  [key: string]: unknown
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function streamQuery(
  data: { prompt: string; connection_id: string; session_id?: string },
  onEvent: (e: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const token = useAuthStore.getState().accessToken
  const resp = await fetch(`${BASE}/api/v1/query/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
    signal,
  })

  if (!resp.ok || !resp.body) {
    let message = "Query failed."
    try {
      const j = await resp.json()
      message = j?.detail?.message ?? j?.message ?? message
    } catch { /* non-JSON error body */ }
    onEvent({ type: "error", message })
    return
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // SSE frames are separated by a blank line; each frame has `data: <json>` lines.
    let sep: number
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep)
      buffer = buffer.slice(sep + 2)
      for (const line of frame.split("\n")) {
        if (line.startsWith("data:")) {
          const payload = line.slice(5).trim()
          if (!payload) continue
          try {
            onEvent(JSON.parse(payload) as StreamEvent)
          } catch { /* ignore malformed frame */ }
        }
      }
    }
  }
}
