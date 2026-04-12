"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { connections } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"

interface StepSetupProps {
  connectionId: string
  onComplete: () => void
}

type Phase = "connecting" | "introspecting" | "inferring" | "polling" | "done" | "error"

interface StepStatus {
  label: string
  state: "pending" | "active" | "done" | "error"
  detail?: string
}

export const StepSetup = ({ connectionId, onComplete }: StepSetupProps) => {
  const [phase, setPhase] = useState<Phase>("connecting")
  const [error, setError] = useState("")
  const [tableCount, setTableCount] = useState(0)
  const [metricCount, setMetricCount] = useState(0)
  const ran = useRef(false)

  const run = useCallback(async () => {
    try {
      setPhase("connecting")
      await new Promise((r) => setTimeout(r, 400))

      setPhase("introspecting")
      const schema = await connections.introspect(connectionId) as { table_count: number }
      setTableCount(schema.table_count || 0)

      setPhase("inferring")
      const ctx = await connections.inferContext(connectionId) as { metric_count?: number }
      setMetricCount(ctx.metric_count || 0)

      setPhase("polling")
      let attempts = 0
      while (attempts < 15) {
        const conn = await connections.get(connectionId) as { status: string }
        if (conn.status === "active") break
        await new Promise((r) => setTimeout(r, 2000))
        attempts++
      }

      setPhase("done")
    } catch (err: unknown) {
      const e = err as { message?: string }
      setError(e.message || "Something went wrong during setup.")
      setPhase("error")
    }
  }, [connectionId])

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    run()
  }, [run])

  const retry = () => {
    setError("")
    ran.current = false
    run()
  }

  const steps: StepStatus[] = [
    {
      label: "Connecting...",
      state: phase === "connecting" ? "active" : phase === "error" && !error ? "error" : "done",
    },
    {
      label: "Reading your database structure...",
      state: phase === "connecting" ? "pending"
        : phase === "introspecting" ? "active"
        : phase === "error" && ["introspecting"].includes(phase) ? "error"
        : ["inferring", "polling", "done"].includes(phase) ? "done" : "pending",
      detail: tableCount > 0 ? `${tableCount} tables found` : undefined,
    },
    {
      label: "Understanding your business data...",
      state: ["connecting", "introspecting"].includes(phase) ? "pending"
        : phase === "inferring" ? "active"
        : ["polling", "done"].includes(phase) ? "done" : "pending",
      detail: metricCount > 0 ? `${metricCount} metrics detected` : undefined,
    },
    {
      label: "Finalizing setup...",
      state: ["connecting", "introspecting", "inferring"].includes(phase) ? "pending"
        : phase === "polling" ? "active"
        : phase === "done" ? "done" : "pending",
    },
  ]

  const doneLabel = `Ready! Found ${tableCount} tables and ${metricCount} metrics.`

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex flex-col gap-3">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <div className="flex items-center justify-center h-5 w-5 shrink-0">
              {s.state === "done" && <CheckCircle2 size={16} className="text-success" />}
              {s.state === "active" && <Loader2 size={16} className="text-brand-mid animate-spin" />}
              {s.state === "error" && <XCircle size={16} className="text-danger" />}
              {s.state === "pending" && <div className="h-2 w-2 rounded-full bg-[var(--border)]" />}
            </div>
            <div className="flex flex-col">
              <span className={cn(
                "text-sm",
                s.state === "active" ? "text-[var(--text)]" : s.state === "done" ? "text-success" : "text-[var(--text-muted)]"
              )}>
                {s.label}
              </span>
              {s.detail && s.state === "done" && (
                <span className="text-xs text-[var(--text-muted)]">{s.detail}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {phase === "done" && (
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-2 text-sm text-success font-medium">
            <CheckCircle2 size={16} />
            {doneLabel}
          </div>
          <Button onClick={onComplete}>Go to Dashboard</Button>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col gap-3 pt-3">
          <div className="flex items-center gap-2 text-sm text-danger">
            <XCircle size={16} />
            {error}
          </div>
          <Button variant="ghost" onClick={retry}>Retry</Button>
        </div>
      )}
    </div>
  )
}

export default StepSetup
