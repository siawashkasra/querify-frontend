export type DbType = "postgres" | "mysql" | "mssql" | "bigquery" | "snowflake" | "redshift"
export type ConnectionStatus = "active" | "error" | "pending" | "untested"
export type MessageStatus = "success" | "failed" | "pending" | "empty" | "timeout" | "unsafe"
export type MessageRole = "user" | "assistant"
export type InsightSeverity = "info" | "warning" | "critical"
export type ExportStatus = "pending" | "processing" | "done" | "failed"

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
}

export interface KPICard {
  label: string
  value: number | string
  aggregation: string
  delta?: number | null
  delta_label?: string | null
}

export interface ChartConfig {
  type: "bar" | "line" | "area" | "pie" | "bar_horizontal" | "scatter"
  x_field: string
  y_field: string
  title?: string | null
  x_axis?: string | null
  y_axis?: string | null
  data?: Record<string, unknown>[] | null
  format?: string | null
  highlight_last?: boolean
  highlight_first?: boolean
  orientation?: string | null
}

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
  response_type?: "standard" | "analytical" | "correction_acknowledged"
  analytical_narrative?: string | null
  analytical_sub_queries?: AnalyticalSubQuery[]
  confidence_score?: number | null
  confidence_level?: "high" | "medium" | "low" | null
  confidence_factors?: string[]
  confidence_caveats?: string[]
}

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

export type PipelineStage = "introspection" | "context" | "insights" | "complete" | "failed"

export interface PipelineStatus {
  stage: PipelineStage
  progress_pct: number
  insights_count: number
  error?: string | null
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
