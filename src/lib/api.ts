import axios, { AxiosError, AxiosResponse } from "axios"
import { v4 as uuidv4 } from "uuid"
import type {
  Connection,
  ConnectionTestResult,
  SchemaSnapshot,
  ChatSession,
  ChatMessage,
  QueryResult,
  Insight,
  ExportJob,
  PaginatedResponse,
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
    const detail = error.response?.data?.detail
    const message = detail?.message || error.message || "An unexpected error occurred"
    const error_type = detail?.error_type || "UNKNOWN_ERROR"
    return Promise.reject({ error_type, message, status: error.response?.status })
  }
)

const get = <T>(url: string, params?: Record<string, unknown>) =>
  (http as unknown as { get: (url: string, cfg: object) => Promise<T> }).get(url, { params })

const post = <T>(url: string, data?: unknown, signal?: AbortSignal) =>
  (http as unknown as { post: (url: string, data: unknown, cfg?: object) => Promise<T> }).post(url, data, signal ? { signal } : undefined)

const del = <T>(url: string) =>
  (http as unknown as { delete: (url: string) => Promise<T> }).delete(url)

export const connections = {
  list: () => get<Connection[]>("/api/v1/connections"),
  get: (id: string) => get<Connection>(`/api/v1/connections/${id}`),
  create: (data: {
    name: string
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl_mode?: string
  }) => post<Connection>("/api/v1/connections", data),
  test: (data: {
    host: string
    port: number
    database: string
    username: string
    password: string
    ssl_mode?: string
  }) => post<ConnectionTestResult>("/api/v1/connections/test", data),
  delete: (id: string) => del<void>(`/api/v1/connections/${id}`),
  introspect: (id: string) => post<SchemaSnapshot>(`/api/v1/connections/${id}/schema/introspect`),
  getSchema: (id: string) => get<SchemaSnapshot>(`/api/v1/connections/${id}/schema`),
  inferContext: (id: string) => post<Record<string, unknown>>(`/api/v1/connections/${id}/context/infer`),
  getContext: (id: string) => get<Record<string, unknown>>(`/api/v1/connections/${id}/context`),
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
  list: (connection_id?: string) =>
    get<Insight[]>("/api/v1/insights", connection_id ? { connection_id } : undefined),
  markRead: (id: string) => post<Insight>(`/api/v1/insights/${id}/read`),
}

export const exports = {
  list: (connection_id?: string) =>
    get<ExportJob[]>("/api/v1/exports", connection_id ? { connection_id } : undefined),
  get: (id: string) => get<ExportJob>(`/api/v1/exports/${id}`),
  create: (data: { message_id: string; format: "csv" | "pdf" | "xlsx" }) =>
    post<ExportJob>("/api/v1/exports", data),
}

export default http
