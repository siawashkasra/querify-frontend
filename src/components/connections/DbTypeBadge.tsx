import { cn } from "@/lib/cn"

const DB_TYPE_CONFIG: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
  postgres: { label: "PostgreSQL", dotClass: "bg-blue-500", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  mysql: { label: "MySQL", dotClass: "bg-orange-500", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  mssql: { label: "SQL Server", dotClass: "bg-slate-400", badgeClass: "bg-slate-100 text-slate-600 border-slate-200" },
}

interface DbTypeBadgeProps {
  dbType: string
  className?: string
}

export function DbTypeBadge({ dbType, className }: DbTypeBadgeProps) {
  const cfg = DB_TYPE_CONFIG[dbType]
  if (!cfg) return <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border bg-[var(--surface-3)] text-[var(--text-muted)] border-[var(--border)]", className)}>{dbType}</span>
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border", cfg.badgeClass, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", cfg.dotClass)} />
      {cfg.label}
    </span>
  )
}

export default DbTypeBadge
