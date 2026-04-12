export type DbType = "postgres" | "mysql" | "mssql" | "bigquery" | "snowflake" | "redshift"
export type ConnectionStatus = "active" | "error" | "pending" | "untested"
export type MessageStatus = "success" | "failed" | "pending"
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
  type: "bar" | "line" | "area" | "pie" | "horizontal_bar" | "scatter"
  x_axis: string
  y_axis: string
  title?: string | null
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
  result_preview: unknown[][] | null
  chart_config: ChartConfig | null
  kpi_cards: KPICard[] | null
  assumptions: string[] | null
  error_type: string | null
  error_message: string | null
  execution_ms: number | null
  total_response_ms: number | null
  feedback_score: number | null
  created_at: string
}

export interface QueryResult {
  message_id: string
  status: MessageStatus
  summary: string | null
  sql: string | null
  chart_config: ChartConfig | null
  kpi_cards: KPICard[]
  columns: string[]
  rows: Record<string, unknown>[]
  assumptions: string[]
  error_type: string | null
  message: string | null
  suggestions: string[]
  execution_ms: number | null
  total_ms: number | null
  model_used?: string | null
  feedback_score?: 1 | -1 | null
}

export type InsightType = "revenue_trend" | "new_users" | "churn_signal" | "top_performer" | "anomaly"
export type InsightConfidence = "high" | "medium" | "low"

export interface Insight {
  id: string
  connection_id: string
  type: InsightType
  headline: string
  summary: string
  chart_config: ChartConfig | null
  data_snapshot: Record<string, unknown> | null
  confidence: InsightConfidence
  is_read: boolean
  generated_at: string
  title?: string
  description?: string
  severity?: InsightSeverity
  read?: boolean
  created_at?: string
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
