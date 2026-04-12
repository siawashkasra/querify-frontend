"use client"

import { ExternalLink } from "lucide-react"
import Button from "@/components/ui/Button"
import Card from "@/components/ui/Card"
import Badge from "@/components/ui/Badge"
import type { ConnectionFormData } from "./StepDetails"

interface StepReviewProps {
  form: ConnectionFormData
  onBack: () => void
  onSave: () => void
  saving: boolean
}

export const StepReview = ({ form, onBack, onSave, saving }: StepReviewProps) => {
  const rows = [
    { label: "Connection name", value: form.name },
    { label: "Database type", value: form.db_type.toUpperCase() },
    { label: "Host", value: form.host },
    { label: "Port", value: String(form.port) },
    { label: "Database", value: form.database },
    { label: "Username", value: form.username },
    { label: "Password", value: "••••••••" },
    { label: "SSL mode", value: form.ssl_mode },
  ]

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <Card header="Connection summary">
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">{r.label}</span>
              <span className="text-sm text-[var(--text)] font-mono">{r.value}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-2 rounded bg-surface-2 border border-[var(--border)] px-4 py-3">
        <Badge variant="pending">Tip</Badge>
        <span className="text-xs text-[var(--text-dim)]">
          We recommend a read-only database user.{" "}
          <a
            href="/help/database-setup/read-only-user"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-brand-mid hover:underline"
          >
            See setup guide <ExternalLink size={10} />
          </a>
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={onBack} disabled={saving}>Back</Button>
        <Button onClick={onSave} loading={saving}>Save and connect</Button>
      </div>
    </div>
  )
}

export default StepReview
