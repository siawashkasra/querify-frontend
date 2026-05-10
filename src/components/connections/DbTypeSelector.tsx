"use client"

import { useState } from "react"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"

export type DbTypeValue = "postgres" | "mysql" | "mssql"

interface DbTypeOption {
  value: DbTypeValue
  label: string
  description: string
  defaultPort: number
  defaultSsl: string
  iconBg: string
  iconText: string
}

const DB_TYPE_OPTIONS: DbTypeOption[] = [
  {
    value: "postgres",
    label: "PostgreSQL",
    description: "The most popular open-source database. Supports Supabase, Railway, AWS RDS, Neon, and self-hosted.",
    defaultPort: 5432,
    defaultSsl: "prefer",
    iconBg: "#336791",
    iconText: "PG",
  },
  {
    value: "mysql",
    label: "MySQL",
    description: "The world's most popular open-source database. Supports PlanetScale, AWS RDS, Google Cloud SQL, and self-hosted.",
    defaultPort: 3306,
    defaultSsl: "prefer",
    iconBg: "#E48B00",
    iconText: "MY",
  },
  {
    value: "mssql",
    label: "SQL Server",
    description: "Microsoft SQL Server and Azure SQL Database. Supports SQL Server 2016+ and Azure SQL.",
    defaultPort: 1433,
    defaultSsl: "require",
    iconBg: "#CC2927",
    iconText: "MS",
  },
]

interface DbTypeSelectorProps {
  onNext: (value: DbTypeValue, defaultPort: number, defaultSsl: string) => void
}

export function DbTypeSelector({ onNext }: DbTypeSelectorProps) {
  const [selected, setSelected] = useState<DbTypeValue | null>(null)

  const selectedOption = DB_TYPE_OPTIONS.find((o) => o.value === selected)

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex flex-col gap-3">
        {DB_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={cn(
              "flex items-start gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-brand-mid",
              selected === opt.value
                ? "border-brand bg-[var(--brand-light)]"
                : "border-[var(--border)] bg-white"
            )}
          >
            <div
              className="shrink-0 mt-0.5 h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: opt.iconBg }}
            >
              <span className="text-white text-xs font-bold font-mono">{opt.iconText}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-[var(--text)]">{opt.label}</span>
              <span className="text-xs text-[var(--text-muted)] leading-relaxed">{opt.description}</span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] rounded px-3 py-2">
        Database type cannot be changed after saving. Delete and re-create the connection to change the type.
      </p>

      <div className="flex justify-end">
        <Button
          onClick={() => selectedOption && onNext(selectedOption.value, selectedOption.defaultPort, selectedOption.defaultSsl)}
          disabled={!selected}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default DbTypeSelector
