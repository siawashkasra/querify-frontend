import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios"
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
  PipelineStatus,
  SuggestedQuestion,
  InsightGenerationStatus,
  ConnectionAlert,
  AlertPreferences,
} from "@/types"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TokenPair {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
  company_name: string
}

export interface RegisterResponse {
  user_id: string
  email: string
  message: string
}

// ── Refresh mutex ─────────────────────────────────────────────────────────────

type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }

let isRefreshing = false
let refreshQueue: QueueEntry[] = []

function flushQueue(token: string | null, err: unknown) {
  for (const entry of refreshQueue) {
    if (token) entry.resolve(token)
    else entry.reject(err)
  }
  refreshQueue = []
}

// ── Public routes that skip auth header ───────────────────────────────────────

const PUBLIC_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/accept-invite",
  "/auth/decline-invite",
  "/auth/resend-verification",
]

function isPublicPath(url: string | undefined): boolean {
  if (!url) return false
  return PUBLIC_PATHS.some((p) => url.includes(p))
}

// ── Axios instance ────────────────────────────────────────────────────────────

const http = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
})

// ── Request interceptor: attach X-Request-ID and Bearer token ─────────────────

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers["X-Request-ID"] = uuidv4()

  if (!isPublicPath(config.url)) {
    // Read from Zustand store (safe outside React — store is a singleton)
    const { useAuthStore } = require("@/store/authStore")
    const token: string | null = useAuthStore.getState().accessToken
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`
    }
  }

  return config
})

// ── Response interceptor: 401 → refresh → retry; format errors ───────────────

http.interceptors.response.use(
  (response: AxiosResponse) => {
    // Emit usage warning event so the chat banner can pick it up without prop drilling
    const warning = response.headers?.["x-usage-warning"]
    if (warning === "approaching_limit" && typeof window !== "undefined") {
      const pct = parseInt(response.headers?.["x-usage-pct"] ?? "0", 10)
      window.dispatchEvent(new CustomEvent("querify:usage-warning", { detail: { pct } }))
    }
    return response.data
  },

  async (error: AxiosError<{ detail: { error_type: string; message: string } | string }>) => {
    const status = error.response?.status
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // ── 401 handling with refresh mutex ──────────────────────────────────────
    if (
      status === 401 &&
      !originalRequest._retry &&
      !isPublicPath(originalRequest.url)
    ) {
      // Already refreshing — queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers["Authorization"] = `Bearer ${newToken}`
              resolve(http(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { useAuthStore } = require("@/store/authStore")
        const refreshToken: string | null = useAuthStore.getState().refreshToken

        if (!refreshToken) throw new Error("No refresh token")

        const refreshResp = await axios.post<TokenPair>(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { "Content-Type": "application/json" } }
        )

        const { access_token, refresh_token } = refreshResp.data
        useAuthStore.getState().setTokens(access_token, refresh_token)
        try {
          const base64 = access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")
          const payload = JSON.parse(atob(base64))
          if (payload.tenant_id && payload.role !== undefined) {
            useAuthStore.getState().setTenantContext(
              payload.tenant_id as string,
              payload.role as string,
              Boolean(payload.is_super_admin),
            )
          }
        } catch { /* ignore decode errors */ }

        flushQueue(access_token, null)
        originalRequest.headers["Authorization"] = `Bearer ${access_token}`
        return http(originalRequest)
      } catch (refreshErr) {
        flushQueue(null, refreshErr)
        _logoutAndRedirect()
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    // ── 429: Plan limit exceeded — show specific modal, not generic toast ────
    if (status === 429) {
      const limitDetail = error.response?.data?.detail as Record<string, unknown> | undefined
      const limitError = limitDetail?.error as string | undefined
      if (limitError === "query_limit_exceeded" || limitError === "connection_limit_exceeded") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent(`querify:${limitError}`, { detail: limitDetail })
          )
        }
        return Promise.reject({
          error_type: limitError,
          message: (limitDetail?.message as string) || "Plan limit reached",
          status,
          detail: limitDetail,
        })
      }
    }

    // ── 5xx: generic toast ────────────────────────────────────────────────────
    if (status && status >= 500) {
      toast.error("Something went wrong. Our team has been notified.", {
        duration: 6000,
        id: "server-error",
      })
    }

    // ── Format rejection ──────────────────────────────────────────────────────
    const detail = error.response?.data?.detail
    let message: string
    let error_type: string
    if (Array.isArray(detail)) {
      // FastAPI / Pydantic 422 validation error — array of {msg, loc, ...}
      message = detail[0]?.msg?.replace(/^Value error, /, "") || "Validation error"
      error_type = "VALIDATION_ERROR"
    } else if (typeof detail === "object" && detail !== null) {
      message = detail.message || error.message || "An unexpected error occurred"
      error_type = detail.error_type || "UNKNOWN_ERROR"
    } else {
      message = (typeof detail === "string" ? detail : null) || error.message || "An unexpected error occurred"
      error_type = "UNKNOWN_ERROR"
    }
    return Promise.reject({ error_type, message, status })
  }
)

function _logoutAndRedirect() {
  try {
    const { useAuthStore } = require("@/store/authStore")
    useAuthStore.getState().logout()
    // Clear the httpOnly session cookie via the Route Handler
    fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})
  } catch {
    // ignore if store unavailable (SSR)
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login"
  }
}

// ── Typed helper wrappers ─────────────────────────────────────────────────────

const get = <T>(url: string, params?: Record<string, unknown>) =>
  (http as unknown as { get: (url: string, cfg: object) => Promise<T> }).get(url, { params })

const post = <T>(url: string, data?: unknown, signal?: AbortSignal) =>
  (http as unknown as { post: (url: string, data: unknown, cfg?: object) => Promise<T> }).post(
    url,
    data,
    signal ? { signal } : undefined
  )

const del = <T>(url: string) =>
  (http as unknown as { delete: (url: string) => Promise<T> }).delete(url)

const put = <T>(url: string, data?: unknown) =>
  (http as unknown as { put: (url: string, data: unknown) => Promise<T> }).put(url, data)

const patch = <T>(url: string, data?: unknown) =>
  (http as unknown as { patch: (url: string, data: unknown) => Promise<T> }).patch(url, data)

// ── Auth API ──────────────────────────────────────────────────────────────────

export const auth = {
  login: (data: LoginRequest) => post<TokenPair>("/api/v1/auth/login", data),
  register: (data: RegisterRequest) => post<RegisterResponse>("/api/v1/auth/register", data),
  verifyEmail: (token: string) => post<TokenPair>("/api/v1/auth/verify-email", { token }),
  resendVerification: (email: string) =>
    post<void>("/api/v1/auth/resend-verification", { email }),
  forgotPassword: (email: string) =>
    post<void>("/api/v1/auth/forgot-password", { email }),
  resetPassword: (token: string, new_password: string) =>
    post<TokenPair>("/api/v1/auth/reset-password", { token, new_password }),
  logout: (refresh_token: string) =>
    post<void>("/api/v1/auth/logout", { refresh_token }),
  acceptInvite: (token: string) =>
    post<{
      requires_password_setup: boolean
      setup_token: string | null
      access_token: string | null
      refresh_token: string | null
      expires_in: number | null
    }>("/api/v1/auth/accept-invite", { token }),
  declineInvite: (token: string) =>
    post<void>("/api/v1/auth/decline-invite", { token }),
  completeInviteSetup: (setup_token: string, name: string, password: string) =>
    post<TokenPair>("/api/v1/auth/complete-invite-setup", { setup_token, name, password }),
  changePassword: (current_password: string, new_password: string) =>
    put<void>("/api/v1/auth/password", { current_password, new_password }),
}

// ── Connection API ────────────────────────────────────────────────────────────

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
  getSchemaDiff: (id: string) =>
    get<import("@/types").SchemaDiff | null>(`/api/v1/connections/${id}/schema/diff`),
  acknowledgeSchemaChange: (id: string, refreshContext: boolean) =>
    post<{ acknowledged: boolean; refresh_context_queued: boolean }>(
      `/api/v1/connections/${id}/schema/acknowledge`,
      { refresh_context: refreshContext }
    ),
  inferContext: (id: string) =>
    post<Record<string, unknown>>(`/api/v1/connections/${id}/context/infer`),
  getContext: (id: string) => get<Record<string, unknown>>(`/api/v1/connections/${id}/context`),
  pipelineStatus: (id: string) =>
    get<PipelineStatus>(`/api/v1/connections/${id}/pipeline-status`),
  corrections: (id: string) => get<unknown[]>(`/api/v1/connections/${id}/corrections`),
  suggestedQuestions: (id: string) =>
    get<SuggestedQuestion[]>(`/api/v1/connections/${id}/suggested-questions`),
  generateInsights: (id: string) =>
    post<{ queued: boolean; estimated_completion_seconds: number }>(
      `/api/v1/connections/${id}/insights/generate`
    ),
  insightGenerationStatus: (id: string) =>
    get<InsightGenerationStatus>(`/api/v1/connections/${id}/insights/status`),
  healthCheck: (id: string) =>
    post<import("@/types").HealthCheckResult>(`/api/v1/connections/${id}/health/check`),
  healthHistory: (id: string) =>
    get<import("@/types").HealthLogEntry[]>(`/api/v1/connections/${id}/health/history`),
  healthSummary: (id: string) =>
    get<import("@/types").HealthSummary>(`/api/v1/connections/${id}/health/summary`),
}

export const auditLog = {
  list: (params: {
    connection_id?: string
    event_type?: string
    from_date?: string
    to_date?: string
    limit?: number
    offset?: number
  }) => get<import("@/types").AuditEvent[]>("/api/v1/audit-log", params as Record<string, unknown>),
  exportUrl: (params: {
    connection_id?: string
    event_type?: string
    from_date?: string
    to_date?: string
  }) => {
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
  trend: (id: string, days = 30) =>
    get<import("@/types").ConfidenceTrend>(`/api/v1/connections/${id}/confidence/trend`, { days }),
  byType: (id: string, days = 30) =>
    get<import("@/types").QuestionTypeStats[]>(
      `/api/v1/connections/${id}/confidence/by-type`,
      { days }
    ),
  lowQueries: (id: string, limit = 10) =>
    get<import("@/types").LowConfidenceQuery[]>(
      `/api/v1/connections/${id}/confidence/low-queries`,
      { limit }
    ),
}

export const query = {
  execute: (
    data: { prompt: string; connection_id: string; session_id?: string },
    signal?: AbortSignal
  ) => post<QueryResult>("/api/v1/query/execute", data, signal),
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
    get<Insight[]>("/api/v1/insights", {
      ...(connection_id ? { connection_id } : {}),
      ...(unread_only ? { unread_only: true } : {}),
    }),
  chartData: (id: string, period: string) =>
    get<InsightChartDataPayload>(`/api/v1/insights/${id}/chart-data`, { period }),
  markRead: (id: string) => post<Insight>(`/api/v1/insights/${id}/read`),
  markAllRead: (connection_id?: string) =>
    post<{ updated: number }>(
      "/api/v1/insights/read-all",
      connection_id ? { connection_id } : {}
    ),
  dismiss: (id: string) => del<void>(`/api/v1/insights/${id}`),
  submitFeedback: (
    connection_id: string,
    insight_id: string,
    data: { feedback_score: 1 | -1; is_user_defined_metric: boolean }
  ) =>
    post<{ success: boolean; needs_context_review: boolean }>(
      `/api/v1/connections/${connection_id}/insights/${insight_id}/feedback`,
      data
    ),
  flagContextReview: (connection_id: string, insight_id: string) =>
    post<{ success: boolean }>(
      `/api/v1/connections/${connection_id}/insights/${insight_id}/feedback`,
      { feedback_score: -1, is_user_defined_metric: true }
    ),
  getPerformance: (connection_id: string) =>
    get<import("@/types").InsightPerformanceData>(
      `/api/v1/connections/${connection_id}/insight-performance`
    ),
}

export const exports = {
  list: (connection_id?: string) =>
    get<ExportJob[]>("/api/v1/exports", connection_id ? { connection_id } : undefined),
  get: (id: string) => get<ExportJob>(`/api/v1/exports/${id}`),
  create: (data: { message_id: string; format: "csv" | "pdf" | "xlsx" }) =>
    post<ExportJob>("/api/v1/exports", data),
}

export const alerts = {
  list: (connection_id: string) =>
    get<ConnectionAlert[]>(`/api/v1/connections/${connection_id}/alerts`),
  unread: (connection_id: string) =>
    get<ConnectionAlert[]>(`/api/v1/connections/${connection_id}/alerts/unread`),
  acknowledge: (alert_id: string) =>
    post<{ acknowledged: boolean }>(`/api/v1/alerts/${alert_id}/acknowledge`, {}),
  markAllRead: (connection_id: string) =>
    post<{ marked: number }>(
      `/api/v1/connections/${connection_id}/alerts/mark-all-read`,
      {}
    ),
  updatePreferences: (connection_id: string, prefs: AlertPreferences) =>
    patch<{ updated: boolean }>(`/api/v1/connections/${connection_id}/alert-preferences`, prefs),
}

// ── Tenant & team API ─────────────────────────────────────────────────────────

export interface TenantInfo {
  id: string
  name: string
  slug: string
  status: string
  timezone: string
  notification_email: string | null
  data_retention_days: number | null
  created_at: string
  updated_at: string
}

export interface Member {
  user_id: string
  name: string | null
  email: string
  role: string
  status: string
  last_login_at: string | null
  accepted_at: string | null
}

export interface Invitation {
  id: string
  tenant_id: string
  invited_email: string
  role: string
  status: string
  expires_at: string
  created_at: string
}

export const tenant = {
  get: () => get<TenantInfo>("/api/v1/tenant"),
  update: (data: { name?: string; timezone?: string; notification_email?: string }) =>
    put<TenantInfo>("/api/v1/tenant", data),
  members: () => get<Member[]>("/api/v1/tenant/members"),
  changeMemberRole: (userId: string, role: string) =>
    put<{ message: string }>(`/api/v1/tenant/members/${userId}/role`, { role }),
  removeMember: (userId: string) =>
    del<void>(`/api/v1/tenant/members/${userId}`),
  invitations: () => get<Invitation[]>("/api/v1/tenant/invitations"),
  createInvitation: (email: string, role: string) =>
    post<Invitation>("/api/v1/tenant/invitations", { email, role }),
  cancelInvitation: (id: string) =>
    del<void>(`/api/v1/tenant/invitations/${id}`),
  resendInvitation: (id: string) =>
    post<Invitation>(`/api/v1/tenant/invitations/${id}/resend`),
  suspendMember: (userId: string) =>
    put<{ message: string }>(`/api/v1/tenant/members/${userId}/suspend`, {}),
  unsuspendMember: (userId: string) =>
    put<{ message: string }>(`/api/v1/tenant/members/${userId}/unsuspend`, {}),
  memberStats: () => get<MemberStat[]>("/api/v1/tenant/members/stats"),
  getConnectionAccess: () => get<ConnectionAccessRule[]>("/api/v1/tenant/connection-access"),
  setConnectionAccess: (connId: string, rule: "all" | "admins" | "specific", memberIds: string[]) =>
    put<ConnectionAccessRule>(`/api/v1/tenant/connection-access/${connId}`, { rule, member_ids: memberIds }),
  delete: () => del<void>("/api/v1/tenant"),
  updateSettings: (data: {
    name?: string
    timezone?: string
    notification_email?: string | null
    data_retention_days?: number | null
  }) => put<TenantInfo>("/api/v1/tenant", data),
}

// ── Me (user profile) API ─────────────────────────────────────────────────────

export interface UserProfile {
  user_id: string
  name: string | null
  email: string
  status: string
  created_at: string
}

export interface UserTenant {
  tenant_id: string
  tenant_name: string
  role: string
  status: string
}

export const me = {
  profile: () => get<UserProfile>("/api/v1/me"),
  updateProfile: (name: string) => put<UserProfile>("/api/v1/me", { name }),
  tenants: () => get<UserTenant[]>("/api/v1/me/tenants"),
  switchTenant: (tenant_id: string) =>
    post<TokenPair>("/api/v1/me/switch-tenant", { tenant_id }),
}

// ── Billing API ───────────────────────────────────────────────────────────────

export interface UsageSummary {
  queries_used: number
  query_limit: number | null
  connections_used: number
  connection_limit: number | null
  seats_used: number
  seat_limit: number | null
  period_end: string | null
  days_remaining: number
}

export interface ExtendedUsage extends UsageSummary {
  exports_used: number
  export_limit: number | null
  history_days: number
  period_start: string | null
}

export interface MemberStat {
  user_id: string
  queries_this_month: number
  last_query_at: string | null
}

export interface SuccessRateSummary {
  this_month_pct: number
  last_month_pct: number
  total_queries_this_month: number
  total_queries_last_month: number
}

export interface ConnectionAccessRule {
  connection_id: string
  rule: "all" | "admins" | "specific"
  member_ids: string[]
}

export interface PlanChangePreview {
  current_plan: string
  new_plan: string
  billing_period: string
  is_upgrade: boolean
  amount_due_now: number
  next_invoice_amount: number
  next_invoice_date: string | null
  effective_date: string
}

export interface PlanChangeResponse {
  redirect: boolean
  checkout_url: string | null
  plan_name: string | null
  status: string | null
  pending_plan_change: string | null
  pending_change_date: string | null
  message: string
}

export interface PaymentMethod {
  brand: string | null
  last4: string | null
  exp_month: number | null
  exp_year: number | null
}

export interface SubscriptionInfo {
  plan_name: string
  status: string
  billing_period: string
  current_period_end: string | null
  cancelled_at: string | null
  pending_plan_change: string | null
  pending_change_date: string | null
  stripe_customer_id: string | null
}

export interface CancelResponse {
  message: string
  period_end: string | null
  plan_name: string | null
}

export interface ReactivateResponse {
  message: string
  status: string
}

export interface InvoiceItem {
  id: string
  amount_paid: number
  status: string | null
  created: number
  invoice_pdf: string | null
}

export const billing = {
  subscription: () => get<SubscriptionInfo>("/api/v1/billing/subscription"),
  usage: () => get<UsageSummary>("/api/v1/billing/usage"),
  paymentMethod: () => get<PaymentMethod>("/api/v1/billing/payment-method"),
  extendedUsage: () => get<ExtendedUsage>("/api/v1/billing/usage/extended"),
  memberUsage: () => get<MemberStat[]>("/api/v1/billing/usage/by-member"),
  successRate: () => get<SuccessRateSummary>("/api/v1/billing/usage/success-rate"),
  planPreview: (new_plan_name: string, billing_period: string) =>
    get<PlanChangePreview>("/api/v1/billing/plan/preview", { new_plan_name, billing_period }),
  changePlan: (new_plan_name: string, billing_period: string) =>
    post<PlanChangeResponse>("/api/v1/billing/plan/change", { new_plan_name, billing_period }),
  cancel: (reason: string, reason_detail?: string) =>
    post<CancelResponse>("/api/v1/billing/cancel", { reason, reason_detail: reason_detail ?? "" }),
  reactivate: () => post<ReactivateResponse>("/api/v1/billing/reactivate", {}),
  portal: () => post<{ portal_url: string }>("/api/v1/billing/portal", {}),
  invoices: () => get<InvoiceItem[]>("/api/v1/billing/invoices"),
  checkoutSuccess: (session_id: string) =>
    get<{ plan_name: string; status: string; message: string }>(
      "/api/v1/billing/checkout/success",
      { session_id }
    ),
}

export default http
