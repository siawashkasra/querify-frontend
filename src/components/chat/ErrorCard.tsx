"use client"

import { useRouter } from "next/navigation"
import { AlertTriangle, RefreshCw, Settings, MessageSquarePlus, ShieldOff, Info } from "lucide-react"
import { cn } from "@/lib/cn"

interface ErrorCardConfig {
  icon: React.ElementType
  title: string
  body: string
  suggestion?: string
  neutral?: boolean
  actions?: {
    label: string
    icon?: React.ElementType
    onClick: () => void
    variant?: "primary" | "ghost"
  }[]
}

interface ErrorCardProps {
  errorType?: string | null
  errorDetail?: string | null
  onRetry?: () => void
  retryLabel?: string
  onRephrase?: () => void
}

export const ErrorCard = ({ errorType, errorDetail, onRetry, retryLabel, onRephrase }: ErrorCardProps) => {
  const router = useRouter()

  const config = ((): ErrorCardConfig => {
    switch (errorType) {
      case "GENERATION_FAILED":
      case "SQL_GENERATION_FAILED":
        return {
          icon: AlertTriangle,
          title: "I could not generate a valid query for that question.",
          body: "Try rephrasing — for example: What is my total revenue this month?",
          actions: [
            ...(onRetry ? [{ label: "Try again", icon: RefreshCw, onClick: onRetry }] : []),
            ...(onRephrase ? [{ label: "Rephrase prompt", icon: MessageSquarePlus, onClick: onRephrase, variant: "ghost" as const }] : []),
          ],
        }
      case "VALIDATION_FAILED":
        return {
          icon: ShieldOff,
          title: "That question would require a query I cannot safely run.",
          body: "Querify only runs SELECT queries — it cannot modify your data.",
        }
      case "EXECUTION_FAILED":
      case "EXEC_SYNTAX":
      case "EXEC_PERMISSION":
      case "EXEC_UNKNOWN":
        return {
          icon: AlertTriangle,
          title: "The query ran but your database returned an error.",
          body: "This may be a schema mismatch. Try refreshing your connection.",
          suggestion: errorDetail ?? undefined,
          actions: [{ label: "Connection settings", icon: Settings, onClick: () => router.push("/settings"), variant: "ghost" as const }],
        }
      case "TIMEOUT":
      case "LLM_TIMEOUT":
      case "PIPELINE_TIMEOUT":
      case "EXEC_TIMEOUT":
        return {
          icon: AlertTriangle,
          title: "This is a large query.",
          // The backend sends a specific, actionable message (names the cause + narrowing).
          body: errorDetail ?? "Try a more specific question or add a date range to limit results.",
          actions: [...(onRetry ? [{ label: retryLabel ?? "Run on last 30 days", icon: RefreshCw, onClick: onRetry }] : [])],
        }
      case "UNSAFE":
      case "UNSAFE_BLOCKED":
        return {
          icon: ShieldOff,
          title: "That question appears to require modifying your data.",
          body: "Querify only reads data — it cannot insert, update, or delete.",
        }
      case "EMPTY_RESULT":
      case "EXEC_EMPTY":
        return {
          icon: Info,
          title: "Your database returned no results for that question.",
          body: "This usually means the data does not exist yet for that period.",
          neutral: true,
        }
      case "CONNECTION_FAILED":
        return {
          icon: AlertTriangle,
          title: "Could not reach your database right now.",
          body: "Check your connection in Settings, or try again in a moment.",
          actions: [{ label: "Go to settings", icon: Settings, onClick: () => router.push("/settings") }],
        }
      case "SCHEMA_MISSING":
      case "NO_SNAPSHOT":
        return {
          icon: AlertTriangle,
          title: "No schema snapshot found for this connection.",
          body: "Run schema introspection in Settings to let Querify read your database structure.",
          actions: [{ label: "Go to settings", icon: Settings, onClick: () => router.push("/settings") }],
        }
      default:
        return {
          icon: AlertTriangle,
          title: "Something went wrong with that query.",
          body: errorDetail ?? "Please try again or rephrase your question.",
          actions: [...(onRetry ? [{ label: "Try again", icon: RefreshCw, onClick: onRetry }] : [])],
        }
    }
  })()

  const Icon = config.icon
  const isNeutral = config.neutral

  return (
    <div className={cn(
      "rounded-xl border px-4 py-3 flex flex-col gap-2",
      isNeutral
        ? "border-[var(--border)] bg-[var(--surface-2)]"
        : "border-danger/25 bg-danger/5"
    )}>
      <div className="flex items-start gap-2.5">
        <Icon size={15} className={cn("shrink-0 mt-0.5", isNeutral ? "text-[var(--text-muted)]" : "text-danger")} />
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className={cn("text-sm font-medium leading-snug", isNeutral ? "text-[var(--text-dim)]" : "text-danger")}>
            {config.title}
          </p>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{config.body}</p>
          {config.suggestion && (
            <pre className="mt-1 text-[11px] font-mono text-[var(--text-muted)] bg-danger/5 border border-danger/15 rounded px-2.5 py-1.5 overflow-x-auto whitespace-pre-wrap break-words">
              {config.suggestion}
            </pre>
          )}
        </div>
      </div>

      {config.actions && config.actions.length > 0 && (
        <div className="flex items-center gap-2 pl-[23px]">
          {config.actions.map((action, i) => {
            const ActionIcon = action.icon
            return (
              <button
                key={i}
                onClick={action.onClick}
                className={cn(
                  "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors",
                  action.variant === "ghost"
                    ? "text-[var(--text-dim)] hover:text-brand hover:bg-[var(--brand-light)]"
                    : "bg-danger/10 text-danger hover:bg-danger/15 border border-danger/20"
                )}
              >
                {ActionIcon && <ActionIcon size={11} />}
                {action.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ErrorCard
