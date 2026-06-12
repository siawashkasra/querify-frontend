export type DbType = "postgres" | "mysql" | "mssql" | "bigquery" | "snowflake" | "redshift"
export type ConnectionStatus = "active" | "error" | "pending" | "untested"
export type MessageStatus = "success" | "failed" | "pending" | "empty" | "timeout" | "unsafe" | "declined" | "clarify_needed" | "needs_reverification"
export type MessageRole = "user" | "assistant"
export type InsightSeverity = "info" | "warning" | "critical"
export type ExportStatus = "pending" | "processing" | "done" | "failed"
export type SchemaDiffSeverity = "minor" | "significant" | "breaking"

export interface TypeChange {
  table: string
  column: string
  old_type: string
  new_type: string
}

export interface SchemaDiff {
  has_changes: boolean
  tables_added: string[]
  tables_removed: string[]
  columns_added: Record<string, string[]>
  columns_removed: Record<string, string[]>
  type_changes: Record<string, TypeChange[]>
  severity: SchemaDiffSeverity
  summary: string
}

export interface AlertPreferences {
  connection_degraded?: boolean
  schema_breaking_change?: boolean
  confidence_deterioration?: boolean
  context_very_stale?: boolean
  email_alerts?: boolean
}

export interface Connection {
  id: string
  name: string
  db_type: DbType
  host: string
  port: number
  database_name: string
  username: string
  ssl_mode: string
  status: ConnectionStatus
  table_count?: number | null
  context_layer: Record<string, unknown> | null
  context_version: number | null
  last_tested_at: string | null
  last_introspected_at: string | null
  last_schema_change_at: string | null
  schema_change_acknowledged_at: string | null
  pending_schema_diff: SchemaDiff | null
  staleness_score: number | null
  staleness_level: "fresh" | "aging" | "stale" | "very_stale" | null
  pending_suggestion: string | null
  staleness_computed_at: string | null
  alert_preferences: AlertPreferences | null
  created_at: string
  updated_at: string
}

export interface ConnectionTestResult {
  success: boolean
  message: string
  latency_ms: number | null
  error_type: string | null
}

export interface SchemaTable {
  name: string
  schema: string
  row_estimate: number
  columns: SchemaColumn[]
}

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  is_pk: boolean
  is_fk: boolean
  fk_references: { table: string; column: string } | null
}

export interface SchemaRelationship {
  from_table: string
  from_column: string
  to_table: string
  to_column: string
}

export interface SchemaSnapshot {
  id: string
  connection_id: string
  table_count: number
  created_at: string
  snapshot: {
    tables: SchemaTable[]
    relationships: SchemaRelationship[]
    total_tables: number
    capped: boolean
  }
}

export interface ChatSession {
  id: string
  connection_id: string
  title: string | null
  created_at: string
  last_active_at: string
  dominant_intent?: string | null
  user_renamed?: boolean
}

export interface KPICard {
  label: string
  value: number | string
  aggregation: string
  delta?: number | null
  delta_label?: string | null
}

export type ChartType =
  | "line" | "area" | "bar" | "bar_horizontal" | "horizontal_bar" | "grouped_bar"
  | "stacked_bar" | "stacked_100_bar" | "donut" | "pie" | "scatter" | "histogram"
  | "waterfall" | "sparkline" | "gauge" | "combo" | "diverging_bar"

export interface ChartConfig {
  type: ChartType
  x_field?: string | null
  y_field?: string | null
  title?: string | null
  x_axis?: string | null
  y_axis?: string | null
  series?: string[]
  color_scheme?: "brand" | "sequential" | "categorical" | "diverging" | "good_bad" | null
  sort_order?: "asc" | "desc" | null
  dashed_from?: number | null
  emphasis_points?: number[]
  annotations?: Record<string, unknown>[]
  role?: "primary" | "supporting"
  data?: Record<string, unknown>[] | null
  format?: string | null
  highlight_last?: boolean
  highlight_first?: boolean
  orientation?: string | null
}

// ── Analytical composition blocks (Part 4) ──────────────────────────────────
export interface AnalystKpiCard {
  label: string
  value: number | string
  formatted?: string
  delta?: number | null
  aggregation?: string
}

export type ResponseBlock =
  | { type: "headline_block"; text: string; summary?: string | null }
  | { type: "kpi_row"; cards: AnalystKpiCard[] }
  // chart blocks may carry their OWN data (a §B sub-result), falling back to the result rows
  | { type: "chart_block"; config: ChartConfig; columns?: string[]; rows?: unknown[][]; question?: string; role?: string }
  | { type: "insight_block"; insights: string[] }
  | { type: "narrative_block"; heading?: string | null; text: string }
  | { type: "table_block"; columns: string[]; rows: unknown[][]; ranked?: boolean; percent_column?: string | null }
  | { type: "caveat_block"; caveats: string[] }
  | { type: "followup_block"; questions: string[] }

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  prompt: string
  status: MessageStatus
  sql_generated: string | null
  result_summary: string | null
  result_columns: string[] | null
  result_preview: { rows: unknown[][] } | null
  chart_config: ChartConfig | null
  kpi_cards: KPICard[] | null
  assumptions: string[] | null
  error_type: string | null
  error_message: string | null
  execution_ms: number | null
  total_response_ms: number | null
  feedback_score: number | null
  created_at: string
  confidence_score?: number | null
  confidence_level?: "high" | "medium" | "low" | null
  confidence_factors?: string[]
  confidence_caveats?: string[]
  answer_document?: AnswerDocument | null
}

export interface AnalyticalSubQuery {
  question: string
  metric: string
  sql: string | null
  columns: string[]
  rows: unknown[][]
  error: string | null
}

export interface QueryResult {
  message_id: string
  status: MessageStatus
  summary: string | null
  sql: string | null
  chart_config: ChartConfig | null
  kpi_cards: KPICard[]
  columns: string[]
  rows: unknown[]
  assumptions: string[]
  error_type: string | null
  message: string | null
  suggestions: string[]
  execution_ms: number | null
  total_ms: number | null
  model_used?: string | null
  feedback_score?: 1 | -1 | null
  response_type?: "standard" | "analytical" | "correction_acknowledged" | "clarify" | "panel_message" | "refine" | "needs_reverification"
  analytical_narrative?: string | null
  analytical_sub_queries?: AnalyticalSubQuery[]
  confidence_score?: number | null
  confidence_level?: "high" | "medium" | "low" | null
  confidence_factors?: string[]
  confidence_caveats?: string[]
  // analytical composition layer
  intent?: string | null
  analysis_tier?: "light" | "medium" | "full" | null
  headline?: string | null
  insights?: string[]
  follow_ups?: string[]
  caveats?: string[]
  blocks?: ResponseBlock[]
  retry_prompt?: string | null
}

// ── Chat Engine v2 — Analytical Canvas ────────────────────────────────────────

export type AnswerCellKind = "title" | "metrics" | "chart" | "table" | "comparison" | "narrative" | "insights"
export type AnswerCellStatus = "running" | "complete" | "error"
export type FollowUpKind = "extend" | "refine" | "quick"
export type AgentNoteKind = "period_alignment" | "defining_filter" | "clarify_resolution" | "fallback_notice"

export interface AnswerCell {
  id: string
  name: string
  kind: AnswerCellKind
  payload: Record<string, unknown>
  status: AnswerCellStatus
  section_id: string
  order: number
}

export interface AgentNote {
  kind: AgentNoteKind
  text: string
}

export interface AnswerSection {
  id: string
  question: string
  title?: string | null
  cells: AnswerCell[]
  agent_notes?: AgentNote[]
  layout?: string[]   // ordered cell ids after layout event
}

export interface AnswerDocument {
  sections: AnswerSection[]
  follow_ups?: string[]
  completion_text?: string | null
  confidence?: { level: string; score?: number; caveats?: string[] } | null
}

// v2 SSE events
export interface V2SectionStartEvent { type: "section_start"; protocol_version: 2; section_id: string; question: string }
export interface V2CellStartEvent { type: "cell_start"; protocol_version: 2; id: string; name: string; kind: AnswerCellKind; section_id: string }
export interface V2CellCompleteEvent { type: "cell_complete"; protocol_version: 2; cell: AnswerCell }
export interface V2CellUpdateEvent { type: "cell_update"; protocol_version: 2; cell: AnswerCell }
export interface V2LayoutEvent { type: "layout"; protocol_version: 2; section_id: string; order: string[] }
export interface V2AgentNoteEvent { type: "agent_note"; protocol_version: 2; section_id: string; kind: AgentNoteKind; text: string }
export interface V2SessionTitleEvent { type: "session_title"; protocol_version: 2; title: string }
export interface V2DocDoneEvent { type: "doc_done"; protocol_version: 2; follow_ups?: string[]; confidence?: AnswerDocument["confidence"]; completion_text?: string | null }
export interface V2PanelMessageEvent { type: "panel_message"; protocol_version: 2; text: string }

export type V2Event =
  | V2SectionStartEvent | V2CellStartEvent | V2CellCompleteEvent | V2CellUpdateEvent
  | V2LayoutEvent | V2AgentNoteEvent | V2SessionTitleEvent | V2DocDoneEvent | V2PanelMessageEvent

export type InsightType = "revenue_trend" | "new_users" | "churn_signal" | "top_performer" | "anomaly" | "recurring_question"
export type InsightConfidence = "high" | "medium" | "low"

export interface Insight {
  id: string
  connection_id: string
  type: InsightType
  headline: string
  summary: string
  recommendation?: string | null
  chart_config: ChartConfig | null
  data_snapshot: Record<string, unknown> | null
  confidence: InsightConfidence
  is_read: boolean
  is_urgent: boolean
  feedback_score: 1 | -1 | null
  needs_context_review: boolean
  is_user_defined_metric?: boolean
  generated_at: string
  title?: string
  description?: string
  severity?: InsightSeverity
  read?: boolean
  created_at?: string
}

export interface InsightChartDataPayload {
  data: Record<string, unknown>[]
}

export interface GeneratorPerformanceStat {
  positive_rate: number
  sample_size: number
}

export interface InsightPerformanceData {
  connection_id: string
  generator_performance: Record<string, GeneratorPerformanceStat>
}

export interface InsightGenerationStatus {
  state: "idle" | "queued" | "running" | "completed" | "failed"
  progress_pct: number
  message: string
  started_at?: string | null
  updated_at?: string | null
  finished_at?: string | null
  generated?: number | null
  failed?: number | null
}

export interface ExportJob {
  id: string
  connection_id: string
  query: string
  status: ExportStatus
  file_url: string | null
  created_at: string
  completed_at: string | null
}

export type PipelineStage = "introspection" | "context" | "model" | "insights" | "complete" | "failed"

export interface PipelineStatus {
  stage: PipelineStage
  progress_pct: number
  insights_count: number
  requires_confirmation?: boolean
  error?: string | null
}

// ── semantic model confirmation (onboarding) ────────────────────────────────
export interface ModelMeasure {
  name: string
  table: string
  expr: string
  unit?: string
  source?: string
  confidence?: string
}

export interface ModelSummary {
  business_summary: string
  business_type: string
  readings: string[]
  measures: ModelMeasure[]
  entities: { name: string; table: string; kind: string }[]
  dimensions: { name: string; table: string; column: string; sample_values?: unknown[] }[]
  time_grain: string | null
  ignored_tables: string[]
  confirmed: boolean | null
  dashboard_preview?: { name: string; format?: string }[]
}

export interface ConfirmModelResponse {
  ack: string
  applied: string[]
  rejected: string[]
  confirmed: boolean
  dashboard_ready: boolean
  model: ModelSummary
}

export interface SuggestedQuestion {
  question: string
  category: string
  complexity: string
  reason: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error_type: string
  message: string
  request_id: string | null
}

export interface AuditEvent {
  id: string
  event_type: string
  connection_id: string | null
  connection_name: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface HealthLogEntry {
  id: string
  checked_at: string
  status: "healthy" | "degraded" | "unreachable"
  response_ms: number | null
  error_type: string | null
  error_message: string | null
}

export interface HealthIncident {
  start: string
  end: string | null
  status: string
  duration_minutes: number | null
}

export interface HealthSummary {
  uptime_pct: number
  avg_response_ms: number | null
  total_checks: number
  incidents: HealthIncident[]
}

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unreachable"
  response_ms: number | null
  error_type: string | null
  error_message: string | null
  previous_status: string | null
}

export interface DailyAverage {
  date: string
  avg_score: number
  query_count: number
}

export interface ConfidenceTrend {
  daily_averages: DailyAverage[]
  overall_avg: number | null
  trend_direction: "improving" | "stable" | "deteriorating" | null
  change_from_previous_period: number | null
}

export interface QuestionTypeStats {
  question_type: string
  avg_confidence: number
  query_count: number
}

export interface LowConfidenceQuery {
  id: string
  prompt: string | null
  confidence_score: number | null
  confidence_level: string | null
  confidence_factors: Record<string, unknown> | null
  created_at: string
}

export type AlertPriority = "high" | "medium" | "low"

export interface ConnectionAlert {
  id: string
  connection_id: string
  alert_type: string
  priority: AlertPriority
  title: string
  message: string
  action_label: string | null
  action_url: string | null
  is_read: boolean
  acknowledged_at: string | null
  email_sent_at: string | null
  created_at: string
}

// ── Auto-generated dashboard (Part 1) ────────────────────────────────────────
export interface DashboardKpi {
  id: string
  name: string
  format: "currency" | "percent" | "number"
  good_direction: "up" | "down"
  why: string
  value: number | null
  formatted: string
  previous: number | null
  delta_abs: number | null
  delta_pct: number | null
  direction: "up" | "down" | "flat"
  is_good: boolean | null
  sparkline: { period: string; value: number }[]
  status: string
}

export interface DashboardChartTile {
  id: string
  title: string
  intent: string
  period: string
  hidden: boolean
  config: ChartConfig
  columns: string[]
  rows: unknown[][]
  status: string
}

export interface DashboardChange {
  id: string
  label: string
  text: string
  direction: "up" | "down"
  delta: number
  is_good: boolean | null
}

export interface DashboardData {
  connection_id: string
  business_type: string
  generated_at: string | null
  resolved_at: string | null
  status: "ok" | "partial" | "no_definition"
  kpis: DashboardKpi[]
  charts: DashboardChartTile[]
  changes: DashboardChange[]
  cached: boolean
}

export interface DashboardSummary {
  connection_id: string
  name: string | null
  status: string
  business_type: string | null
  has_dashboard: boolean
}

// ── AI business briefing (Odoo-style home dashboard) ─────────────────────────
export interface BriefingKpiData {
  id: string
  label: string
  format: "currency" | "percent" | "number"
  good_direction: "up" | "down"
  icon_hint: string
  value: number | null
  formatted: string
  previous: number | null
  delta_abs: number | null
  delta_pct: number | null
  direction: "up" | "down" | "flat"
  is_good: boolean | null
  sparkline: { period: string; value: number }[]
  trend: { direction: "up" | "down" | "flat"; rate_pct: number; label: string } | null
  caption: string | null
  status: string
}

export interface BriefingDriverEntry {
  segment: string
  delta: number
  formatted: string
  current: number
  previous: number
}

export interface BriefingDrivers {
  measure: string
  dimension: string
  format: string
  window: string
  total_delta: number
  formatted_delta: string
  gainers: BriefingDriverEntry[]
  drags: BriefingDriverEntry[]
  text: string
}

export interface BriefingForecastPoint {
  period: string
  value: number
  lo: number
  hi: number
  formatted?: string
  formatted_range?: string
}

export interface BriefingForecast {
  measure: string
  format: string
  currency?: string | null
  ok: boolean
  method: string
  confidence: "low" | "medium"
  caveats: string[]
  flagged_reason?: string | null
  history: { period: string; value: number }[]
  points: BriefingForecastPoint[]
}

export interface BriefingPattern {
  type: string
  headline: string
  summary: string
  trend_direction?: string | null
}

export interface BriefingPriority {
  priority: "high" | "medium" | "low"
  direction: "risk" | "positive" | "neutral"
  title: string
  detail: string
  explore_question: string
  deep_link_label: string
}

export interface BriefingData {
  connection_id: string
  business_type: string
  business_summary: string
  greeting_summary: string
  headline_paragraph: string
  status: "ok" | "partial" | "no_definition" | "needs_reverification"
  kpis: BriefingKpiData[]
  // FIX 3 — KPIs pulled out of the grid for failing the sanity gate (small tiles)
  needs_verification?: { label: string; reason: string }[]
  priorities: BriefingPriority[]
  drivers: BriefingDrivers | null
  patterns: BriefingPattern[]
  forecast: BriefingForecast | null
  resolved_at: string | null
  cached: boolean
}
