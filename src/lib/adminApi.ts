/**
 * Typed API client for the super-admin dashboard endpoints.
 * All calls include the Bearer token from the auth store.
 */

const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    // access token is in-memory (zustand), never localStorage
    const { useAuthStore } = require("@/store/authStore")
    return useAuthStore.getState().accessToken ?? null
  } catch {
    return null
  }
}


// ── KPI types ─────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  active_tenants_week: number
  query_success_rate_today: number
  avg_latency_ms_today: number
  llm_cost_usd_today: number
}

// ── Chart types ───────────────────────────────────────────────────────────────

export interface DashboardCharts {
  query_volume_by_hour: { hour: string; count: number }[]
  success_rate_by_day: { day: string; rate: number }[]
  signups_by_day: { day: string; count: number }[]
}

// ── Feed types ────────────────────────────────────────────────────────────────

export interface RecentSignup {
  tenant_id: string
  tenant_name: string
  plan_name: string
  signed_up_at: string
  first_query_at: string | null
}

export interface RecentFailure {
  message_id: string
  tenant_name: string
  tenant_id: string
  error_type: string
  failed_at: string
}

export interface DashboardFeeds {
  recent_signups: RecentSignup[]
  recent_failures: RecentFailure[]
}

// ── Health types ──────────────────────────────────────────────────────────────

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown"

export interface ComponentHealth {
  status: HealthStatus
  detail?: string
  error_rate_pct?: number
  total_queries_1h?: number
  avg_response_ms?: number
  last_call_at?: string | null
  queued?: number
}

export interface DashboardHealth {
  database: ComponentHealth
  redis: ComponentHealth
  api: ComponentHealth
  llm_api: ComponentHealth
  celery: ComponentHealth
}

// ── Tenant list types ─────────────────────────────────────────────────────────

export interface TenantRow {
  id: string
  name: string
  owner_email: string | null
  plan_name: string
  is_manual_override: boolean
  override_reason: string | null
  override_by: string | null
  override_at: string | null
  override_expires_at: string | null
  status: string
  created_at: string
  queries_this_month: number
  last_active_at: string | null
  mrr_cents: number
}

export interface TenantListResponse {
  total: number
  page: number
  page_size: number
  tenants: TenantRow[]
}

// ── Tenant detail types ───────────────────────────────────────────────────────

export interface TenantOverview {
  tenant_id: string
  name: string
  status: string
  plan_name: string
  owner_email: string | null
  created_at: string
  subscription_status: string | null
  kpis: { total_queries: number; success_rate: number; avg_latency_ms: number; total_cost_usd: number }
  volume_by_day: { day: string; count: number }[]
  recent_activity: { message_id: string; prompt: string; status: string; execution_ms: number | null; created_at: string }[]
}

export interface TenantMember {
  user_id: string
  email: string
  name: string | null
  role: string
  user_status: string
  membership_status: string
  accepted_at: string | null
  last_login_at: string | null
}

export interface TenantConnection {
  id: string
  name: string | null
  db_type: string
  status: string
  last_tested_at: string | null
  last_introspected_at: string | null
  consecutive_failures: number
  table_count: number | null
  created_at: string
}

export interface TenantQuery {
  id: string
  prompt: string
  prompt_full: string
  sql: string | null
  status: string
  error_type: string | null
  error_message: string | null
  execution_ms: number | null
  total_response_ms: number | null
  llm_cost_usd: number | null
  model_used: string | null
  created_at: string
}

export interface TenantBilling {
  plan_name: string
  status: string
  billing_period: string | null
  current_period_start: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  queries_used_this_period: number
  cancel_reason: string | null
  cancelled_at: string | null
  is_manual_override: boolean
  override_reason: string | null
  override_by: string | null
  override_at: string | null
  override_expires_at: string | null
}

export interface PlanOverrideRequest {
  plan_name: "free" | "starter" | "pro" | "team"
  reason: string
  duration_days: number | null
}

export interface PlanOverrideResult {
  tenant_id: string
  plan_name: string
  is_manual_override: boolean
  override_reason: string
  override_by: string
  override_at: string
  override_expires_at: string | null
  current_period_end: string
}

export interface AuditEvent {
  id: string
  event_type: string
  connection_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

// ── Support: user lookup types ────────────────────────────────────────────────

export interface UserSearchResult {
  user_id: string
  name: string | null
  email: string
  role: string
  tenant_id: string | null
  tenant_name: string | null
  plan_name: string | null
  last_login_at: string | null
  queries_this_month: number
  account_status: string
}

// ── Support: connection debugger types ────────────────────────────────────────

export interface ConnectionHealthCheck {
  checked_at: string
  passed: boolean
  response_ms: number | null
  error: string | null
}

export interface ConnectionDebug {
  id: string
  name: string | null
  db_type: string
  status: string
  last_introspected_at: string | null
  table_count: number | null
  context_summary: {
    metrics_count: number
    entities_count: number
    version: number | null
  } | null
  health_checks: ConnectionHealthCheck[]
  // host/username/password are NEVER included — masked server-side
}

export interface ConnectionDebugResponse {
  tenant_id: string
  tenant_name: string
  connections: ConnectionDebug[]
}

// ── Support: query replay types ───────────────────────────────────────────────

export interface QueryReplayLoad {
  message_id: string
  prompt: string
  connection_id: string | null
  connection_name: string | null
  context_version: number | null
  schema_version: string | null
  original_sql: string | null
  original_status: string
  original_result_summary: string | null
  tenant_name: string
  created_at: string
}

export interface ReplayResult {
  new_sql: string | null
  new_status: string
  new_result_summary: string | null
  execution_ms: number | null
  replayed_at: string
  diff_notes: string | null
}

// ── Audit log types ───────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string
  event_type: string
  actor_email: string | null
  actor_id: string | null
  tenant_id: string | null
  tenant_name: string | null
  resource: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogResponse {
  total: number
  rows: AuditLogRow[]
}

// ── Support: email sender types ───────────────────────────────────────────────

export interface EmailSendRequest {
  recipient_type: "tenant" | "plan"
  recipient_id?: string   // tenant_id when type=tenant
  recipient_plan?: string // plan name when type=plan
  subject: string
  body_html: string
}

export interface EmailSendResult {
  sent_count: number
  logged: boolean
}

// ── System health types ───────────────────────────────────────────────────────

export interface ComponentDetail {
  status: HealthStatus
  key_metric_label: string
  key_metric_value: string | number | null
  last_checked_at: string | null
  sparkline: { t: string; v: number }[]  // last 60 data points (1 per min)
  detail?: string
}

export interface SystemHealthDetail {
  api: ComponentDetail
  celery: ComponentDetail
  redis: ComponentDetail
  database: ComponentDetail
  llm_api: ComponentDetail
}

export interface SystemAlert {
  id: string
  component: string
  severity: "critical" | "warning" | "info"
  message: string
  fired_at: string
  resolved_at: string | null
}

// ── Background job types ──────────────────────────────────────────────────────

export type JobType = "schema_introspect" | "context_infer" | "insight_generate" | "export_render"

export interface JobStats {
  queued: number
  running: number
  succeeded_today: number
  failed_today: number
}

export interface JobRow {
  job_id: string
  type: string
  tenant_id: string | null
  tenant_name: string | null
  status: string
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  retry_count: number
  error: string | null
}

export interface JobsResponse {
  total: number
  jobs: JobRow[]
}

export interface JobDurationPoint {
  day: string
  type: string
  avg_duration_ms: number
}

// ── Connection health types ───────────────────────────────────────────────────

export interface ConnectionHealthRow {
  id: string
  tenant_id: string
  tenant_name: string
  connection_name: string | null
  db_type: string
  status: string
  last_tested_at: string | null
  last_success_at: string | null
  consecutive_failures: number
}

export interface ConnectionsHealthResponse {
  total: number
  connections: ConnectionHealthRow[]
}

// ── Revenue types ─────────────────────────────────────────────────────────────

export interface RevenueKpis {
  mrr_cents: number
  new_mrr_cents: number
  churned_mrr_cents: number
  paying_tenants: number
  generated_at: string
}

export interface MrrTrendPoint {
  month: string
  mrr_cents: number
}

export interface MrrMovementPoint {
  month: string
  new_mrr_cents: number
  churned_mrr_cents: number
}

export interface RevenueCharts {
  mrr_trend: MrrTrendPoint[]
  mrr_movement: MrrMovementPoint[]
}

// ── Billing list types ────────────────────────────────────────────────────────

export interface BillingRow {
  tenant_id: string
  tenant_name: string
  plan_name: string
  billing_status: string
  next_invoice_at: string | null
  lifetime_value_cents: number
  failed_payment: boolean
  stripe_customer_id: string | null
}

export interface BillingListResponse {
  total: number
  rows: BillingRow[]
}

// ── LLM cost types ────────────────────────────────────────────────────────────

export interface PlanProfitability {
  plan: string
  avg_queries_month: number
  avg_llm_cost_usd: number
  plan_revenue_usd: number
  gross_margin_pct: number
}

export interface ExpensiveTenant {
  tenant_id: string
  tenant_name: string
  total_cost_usd: number
  queries_count: number
}

export interface CostTrendPoint {
  day: string
  cost_usd: number
}

export interface ModelTierBreakdown {
  tier: string
  pct: number
  query_count: number
}

export interface LlmCostReport {
  generated_at: string
  plan_profitability: PlanProfitability[]
  top_expensive_tenants: ExpensiveTenant[]
  cost_trend: CostTrendPoint[]
  model_tier_breakdown: ModelTierBreakdown[]
}

// ── Query monitoring types ────────────────────────────────────────────────────

export interface QueryFeedRow {
  id: string
  tenant_id: string
  tenant_name: string
  prompt: string
  status: string
  model_used: string | null
  execution_ms: number | null
  total_response_ms: number | null
  llm_cost_usd: number | null
  error_type: string | null
  created_at: string
}

export interface FailedQuery extends QueryFeedRow {
  prompt_full: string
  sql: string | null
  error_message: string | null
}

export interface FailedQueriesResponse {
  total: number
  page: number
  page_size: number
  queries: FailedQuery[]
}

export interface AccuracyReport {
  generated_at: string
  headlines: {
    success_rate_7d: number
    thumbs_up_rate: number | null
    correction_rate: number
    total_queries_7d: number
  }
  by_error_type: { error_type: string; count: number }[]
  success_rate_by_day: { day: string; rate: number }[]
  failure_patterns: { pattern: string; error_type: string; count: number; example_prompt: string }[]
}

// ── Fetchers ──────────────────────────────────────────────────────────────────

export const adminApi = {
  // Dashboard
  kpis: () => adminFetch<DashboardKpis>("/dashboard/kpis"),
  charts: () => adminFetch<DashboardCharts>("/dashboard/charts"),
  feeds: () => adminFetch<DashboardFeeds>("/dashboard/feeds"),
  health: () => adminFetch<DashboardHealth>("/dashboard/health"),

  // Tenant list
  tenants: (params: URLSearchParams) => adminFetch<TenantListResponse>(`/tenants?${params}`),
  exportTenantsUrl: () => `${BASE}/api/v1/admin/tenants/export`,

  // Tenant detail
  tenantOverview: (id: string) => adminFetch<TenantOverview>(`/tenants/${id}/overview`),
  tenantMembers: (id: string) => adminFetch<TenantMember[]>(`/tenants/${id}/members`),
  tenantConnections: (id: string) => adminFetch<TenantConnection[]>(`/tenants/${id}/connections`),
  tenantQueries: (id: string) => adminFetch<TenantQuery[]>(`/tenants/${id}/queries`),
  tenantBilling: (id: string) => adminFetch<TenantBilling>(`/tenants/${id}/billing`),
  tenantAudit: (id: string) => adminFetch<AuditEvent[]>(`/tenants/${id}/audit`),
  impersonateTenant: (id: string) => adminFetch<{ code: string; expires_in: number }>(`/tenants/${id}/impersonate`, "POST"),
  suspendTenant: (id: string, reason: string) =>
    adminFetch<{ status: string }>(`/tenants/${id}/suspend`, "POST", { reason }),
  setTenantPlan: (id: string, body: PlanOverrideRequest) =>
    adminFetch<PlanOverrideResult>(`/tenants/${id}/plan`, "POST", body),

  // System health
  systemHealth: () => adminFetch<SystemHealthDetail>("/system/health"),
  systemAlerts: () => adminFetch<SystemAlert[]>("/system/alerts"),

  // Background jobs
  jobStats: (type?: string) => adminFetch<JobStats>(`/system/jobs/stats${type ? `?type=${type}` : ""}`),
  jobs: (params: URLSearchParams) => adminFetch<JobsResponse>(`/system/jobs?${params}`),
  retryJob: (jobId: string) => adminFetch<{ queued: boolean }>(`/system/jobs/${jobId}/retry`, "POST"),
  jobDurationTrend: () => adminFetch<JobDurationPoint[]>("/system/jobs/duration-trend"),

  // Connection health
  allConnections: (params: URLSearchParams) => adminFetch<ConnectionsHealthResponse>(`/system/connections?${params}`),
  retestConnection: (id: string) => adminFetch<{ queued: boolean }>(`/system/connections/${id}/retest`, "POST"),
  notifyConnectionTenant: (id: string) => adminFetch<{ sent: boolean }>(`/system/connections/${id}/notify`, "POST"),

  // Revenue
  revenueKpis: () => adminFetch<RevenueKpis>("/revenue/kpis"),
  revenueCharts: () => adminFetch<RevenueCharts>("/revenue/charts"),

  // Billing list
  billingList: (params: URLSearchParams) => adminFetch<BillingListResponse>(`/revenue/billing?${params}`),
  extendGracePeriod: (tenantId: string) => adminFetch<{ ok: boolean }>(`/revenue/billing/${tenantId}/grace`, "POST"),
  notifyBillingTenant: (tenantId: string) => adminFetch<{ sent: boolean }>(`/revenue/billing/${tenantId}/notify`, "POST"),

  // LLM costs
  llmCostReport: () => adminFetch<LlmCostReport>("/revenue/llm-costs"),

  // Support: user lookup
  userSearch: (q: string) => adminFetch<UserSearchResult[]>(`/support/users?q=${encodeURIComponent(q)}`),
  sendPasswordReset: (userId: string) =>
    adminFetch<{ sent: boolean }>(`/support/users/${userId}/reset-password`, "POST"),
  sendUserEmail: (userId: string, subject: string, body: string) =>
    adminFetch<{ sent: boolean }>(`/support/users/${userId}/email`, "POST", { subject, body }),

  // Support: connection debugger
  debugConnections: (tenantSearch: string) =>
    adminFetch<ConnectionDebugResponse[]>(`/support/connections?tenant=${encodeURIComponent(tenantSearch)}`),
  debugRetestConnection: (id: string) =>
    adminFetch<{ queued: boolean }>(`/support/connections/${id}/retest`, "POST"),
  debugRefreshSchema: (id: string) =>
    adminFetch<{ queued: boolean }>(`/support/connections/${id}/refresh-schema`, "POST"),
  debugRerunContext: (id: string) =>
    adminFetch<{ queued: boolean }>(`/support/connections/${id}/rerun-context`, "POST"),

  // Support: query replay
  loadQueryReplay: (messageId: string) =>
    adminFetch<QueryReplayLoad>(`/support/replay/${messageId}`),
  replayQuery: (messageId: string) =>
    adminFetch<ReplayResult>(`/support/replay/${messageId}/run`, "POST"),

  // Audit log
  auditLog: (params: URLSearchParams) => adminFetch<AuditLogResponse>(`/audit?${params}`),
  auditLogExportUrl: () => `${BASE}/api/v1/admin/audit/export`,

  // Support: email sender
  tenantSearch: (q: string) => adminFetch<{ tenant_id: string; name: string; plan_name: string }[]>(
    `/support/tenants?q=${encodeURIComponent(q)}`
  ),
  sendEmail: (req: EmailSendRequest) =>
    adminFetch<EmailSendResult>("/support/email/send", "POST", req),

  // Query monitoring
  queryFeed: (params?: URLSearchParams) => adminFetch<QueryFeedRow[]>(`/queries/feed${params ? `?${params}` : ""}`),
  queryDetail: (id: string) => adminFetch<TenantQuery & { tenant_name: string; tenant_id: string }>(`/queries/${id}/detail`),
  failedQueries: (params?: URLSearchParams) => adminFetch<FailedQueriesResponse>(`/queries/failed${params ? `?${params}` : ""}`),
  accuracyReport: () => adminFetch<AccuracyReport>("/queries/accuracy"),
}

// Update adminFetch to support POST
async function adminFetch<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}/api/v1/admin${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Admin API ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}
