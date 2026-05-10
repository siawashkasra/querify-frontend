import axios, { AxiosError, AxiosResponse } from "axios"
import { v4 as uuidv4 } from "uuid"
import { toast } from "react-hot-toast"
import type {
  Connection,
  ConnectionTestResult,
  SchemaSnapshot,
  ChatSession,
  ChatMessage,
  QueryResult,
  Insight,
  InsightChartDataPayload,
  ExportJob,
  PaginatedResponse,
  PipelineStatus,
  SuggestedQuestion,
  InsightGenerationStatus,
  ConnectionAlert,
  AlertPreferences,
} from "@/types"

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
})

http.interceptors.request.use((config) => {
  config.headers["X-Request-ID"] = uuidv4()
  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  (error: AxiosError<{ detail: { error_type: string; message: string } }>) => {
    const status = error.response?.status
    if (status && status >= 500) {
      toast.error("Something went wrong. Our team has been notified.", { duration: 6000, id: "server-error" })
    }
    const detail = error.response?.data?.detail
    const message = detail?.message || error.message || "An unexpected error occurred"
    const error_type = detail?.error_type || "UNKNOWN_ERROR"
    return Promise.reject({ error_type, message, status })
  }
)

const get = <T>(url: string, params?: Record<string, unknown>) =>
  (http as unknown as { get: (url: string, cfg: object) => Promise<T> }).get(url, { params })

const post = <T>(url: string, data?: unknown, signal?: AbortSignal) =>
  (http as unknown as { post: (url: string, data: unknown, cfg?: object) => Promise<T> }).post(url, data, signal ? { signal } : undefined)

const del = <T>(url: string) =>
  (http as unknown as { delete: (url: string) => Promise<T> }).delete(url)

const put = <T>(url: string, data?: unknown) =>
  (http as unknown as { put: (url: string, data: unknown) => Promise<T> }).put(url, data)

const patch = <T>(url: string, data?: unknown) =>
  (http as unknown as { patch: (url: string, data: unknown) => Promise<T> }).patch(url, data)

export const connections = {
  list: () => get<Connection[]>("/api/v1/connections"),
  get: (id: string) => get<Connection>(`/api/v1/connections/${id}`),
  create: (data: {
    name: string
    db_type: string
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl_mode?: string
    extra_params?: Record<string, unknown>
  }) => post<Connection>("/api/v1/connections", data),
  update: (id: string, data: {
    name?: string
    host?: string
    port?: number
    database?: string
    username?: string
    password?: string
    ssl_mode?: string
  }) => put<Connection>(`/api/v1/connections/${id}`, data),
  test: (data: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl_mode?: string
    db_type?: string
  }) => post<ConnectionTestResult>("/api/v1/connections/test", data),
  testExisting: (id: string) => post<ConnectionTestResult>(`/api/v1/connections/${id}/test`),
  delete: (id: string) => del<void>(`/api/v1/connections/${id}`),
  introspect: (id: string) => post<SchemaSnapshot>(`/api/v1/connections/${id}/schema/introspect`),
  getSchema: (id: string) => get<SchemaSnapshot>(`/api/v1/connections/${id}/schema`),
  getSchemaDiff: (id: string) => get<import("@/types").SchemaDiff | null>(`/api/v1/connections/${id}/schema/diff`),
  acknowledgeSchemaChange: (id: string, refreshContext: boolean) => post<{ acknowledged: boolean; refresh_context_queued: boolean }>(`/api/v1/connections/${id}/schema/acknowledge`, { refresh_context: refreshContext }),
  inferContext: (id: string) => post<Record<string, unknown>>(`/api/v1/connections/${id}/context/infer`),
  getContext: (id: string) => get<Record<string, unknown>>(`/api/v1/connections/${id}/context`),
  pipelineStatus: (id: string) => get<PipelineStatus>(`/api/v1/connections/${id}/pipeline-status`),
  corrections: (id: string) => get<unknown[]>(`/api/v1/connections/${id}/corrections`),
  suggestedQuestions: (id: string) => get<SuggestedQuestion[]>(`/api/v1/connections/${id}/suggested-questions`),
  generateInsights: (id: string) => post<{ queued: boolean; estimated_completion_seconds: number }>(`/api/v1/connections/${id}/insights/generate`),
  insightGenerationStatus: (id: string) => get<InsightGenerationStatus>(`/api/v1/connections/${id}/insights/status`),
  healthCheck: (id: string) => post<import("@/types").HealthCheckResult>(`/api/v1/connections/${id}/health/check`),
  healthHistory: (id: string) => get<import("@/types").HealthLogEntry[]>(`/api/v1/connections/${id}/health/history`),
  healthSummary: (id: string) => get<import("@/types").HealthSummary>(`/api/v1/connections/${id}/health/summary`),
}

export const auditLog = {
  list: (params: { connection_id?: string; event_type?: string; from_date?: string; to_date?: string; limit?: number; offset?: number }) =>
    get<import("@/types").AuditEvent[]>("/api/v1/audit-log", params as Record<string, unknown>),
  exportUrl: (params: { connection_id?: string; event_type?: string; from_date?: string; to_date?: string }) => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const q = new URLSearchParams()
    if (params.connection_id) q.set("connection_id", params.connection_id)
    if (params.event_type) q.set("event_type", params.event_type)
    if (params.from_date) q.set("from_date", params.from_date)
    if (params.to_date) q.set("to_date", params.to_date)
    return `${base}/api/v1/audit-log/export?${q.toString()}`
  },
}

export const confidenceAnalytics = {
  trend: (id: string, days = 30) => get<import("@/types").ConfidenceTrend>(`/api/v1/connections/${id}/confidence/trend`, { days }),
  byType: (id: string, days = 30) => get<import("@/types").QuestionTypeStats[]>(`/api/v1/connections/${id}/confidence/by-type`, { days }),
  lowQueries: (id: string, limit = 10) => get<import("@/types").LowConfidenceQuery[]>(`/api/v1/connections/${id}/confidence/low-queries`, { limit }),
}

export const query = {
  execute: (data: { prompt: string; connection_id: string; session_id?: string }, signal?: AbortSignal) =>
    post<QueryResult>("/api/v1/query/execute", data, signal),
  history: (params: {
    connection_id?: string
    session_id?: string
    search?: string
    page?: number
    limit?: number
    offset?: number
  }) => get<ChatMessage[]>("/api/v1/query/history", params as Record<string, unknown>),
  historyItem: (id: string) => get<ChatMessage>(`/api/v1/query/history/${id}`),
  rerun: (id: string) => post<QueryResult>(`/api/v1/query/history/${id}/rerun`),
  feedback: (id: string, score: 1 | -1) =>
    post<{ success: boolean }>(`/api/v1/query/history/${id}/feedback`, { feedback_score: score }),
  session: (id: string) => get<ChatSession>(`/api/v1/sessions/${id}`),
  sessions: (connection_id?: string) =>
    get<ChatSession[]>("/api/v1/sessions", connection_id ? { connection_id } : undefined),
  createSession: (data: { connection_id: string; title?: string }) =>
    post<ChatSession>("/api/v1/sessions", data),
  deleteSession: (id: string) => del<void>(`/api/v1/sessions/${id}`),
}

export const insights = {
  list: (connection_id?: string, unread_only?: boolean) =>
    get<Insight[]>("/api/v1/insights", { ...(connection_id ? { connection_id } : {}), ...(unread_only ? { unread_only: true } : {}) }),
  chartData: (id: string, period: string) =>
    get<InsightChartDataPayload>(`/api/v1/insights/${id}/chart-data`, { period }),
  markRead: (id: string) => post<Insight>(`/api/v1/insights/${id}/read`),
  markAllRead: (connection_id?: string) => post<{ updated: number }>("/api/v1/insights/read-all", connection_id ? { connection_id } : {}),
  dismiss: (id: string) => del<void>(`/api/v1/insights/${id}`),
  submitFeedback: (connection_id: string, insight_id: string, data: { feedback_score: 1 | -1; is_user_defined_metric: boolean }) =>
    post<{ success: boolean; needs_context_review: boolean }>(`/api/v1/connections/${connection_id}/insights/${insight_id}/feedback`, data),
  flagContextReview: (connection_id: string, insight_id: string) =>
    post<{ success: boolean }>(`/api/v1/connections/${connection_id}/insights/${insight_id}/feedback`, { feedback_score: -1, is_user_defined_metric: true }),
  getPerformance: (connection_id: string) =>
    get<import("@/types").InsightPerformanceData>(`/api/v1/connections/${connection_id}/insight-performance`),
}

export const exports = {
  list: (connection_id?: string) =>
    get<ExportJob[]>("/api/v1/exports", connection_id ? { connection_id } : undefined),
  get: (id: string) => get<ExportJob>(`/api/v1/exports/${id}`),
  create: (data: { message_id: string; format: "csv" | "pdf" | "xlsx" }) =>
    post<ExportJob>("/api/v1/exports", data),
}

export const alerts = {
  list: (connection_id: string) => get<ConnectionAlert[]>(`/api/v1/connections/${connection_id}/alerts`),
  unread: (connection_id: string) => get<ConnectionAlert[]>(`/api/v1/connections/${connection_id}/alerts/unread`),
  acknowledge: (alert_id: string) => post<{ acknowledged: boolean }>(`/api/v1/alerts/${alert_id}/acknowledge`, {}),
  markAllRead: (connection_id: string) => post<{ marked: number }>(`/api/v1/connections/${connection_id}/alerts/mark-all-read`, {}),
  updatePreferences: (connection_id: string, prefs: AlertPreferences) => patch<{ updated: boolean }>(`/api/v1/connections/${connection_id}/alert-preferences`, prefs),
}

export default http
