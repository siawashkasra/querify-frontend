"use client"

import { useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { connections } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import Stepper from "@/components/connections/Stepper"
import DbTypeSelector, { type DbTypeValue } from "@/components/connections/DbTypeSelector"
import StepDetails, { type ConnectionFormData } from "@/components/connections/StepDetails"
import StepReview from "@/components/connections/StepReview"
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress"
import { InsightsReveal, FallbackState } from "@/components/onboarding/InsightsReveal"

type Phase = "type" | "form" | "review" | "progress" | "reveal" | "fallback"

const STEPS = ["Database type", "Connection details", "Review", "Setup"]

const DEFAULT_FORM: ConnectionFormData = {
  name: "",
  db_type: "postgres",
  host: "",
  port: 5432,
  database: "",
  username: "",
  password: "",
  ssl_mode: "prefer",
  instance_name: "",
}

export default function NewConnectionPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const setActiveConnection = useAppStore((s) => s.setActiveConnection)
  const [phase, setPhase] = useState<Phase>("type")
  const [form, setForm] = useState<ConnectionFormData>(DEFAULT_FORM)
  const [testPassed, setTestPassed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [fallbackReason, setFallbackReason] = useState("")
  const revealStartMs = useRef(0)

  const stepIndex = phase === "type" ? 0 : phase === "form" ? 1 : phase === "review" ? 2 : 3

  const updateForm = useCallback((patch: Partial<ConnectionFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setTestPassed(false)
  }, [])

  const handleTypeConfirm = useCallback((dbType: DbTypeValue, defaultPort: number, defaultSsl: string) => {
    setForm((prev) => ({ ...prev, db_type: dbType, port: defaultPort, ssl_mode: defaultSsl }))
    setTestPassed(false)
    setPhase("form")
  }, [])

  const handleTestSuccess = useCallback(() => setTestPassed(true), [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const extra_params: Record<string, unknown> = {}
      if (form.instance_name?.trim()) extra_params.instance_name = form.instance_name.trim()
      const conn = await connections.create({
        name: form.name,
        db_type: form.db_type,
        host: form.host,
        port: form.port,
        database: form.database,
        username: form.username,
        password: form.password,
        ssl_mode: form.ssl_mode,
        ...(Object.keys(extra_params).length > 0 ? { extra_params } : {}),
      }) as { id: string }
      setSavedId(conn.id)
      setActiveConnection(conn.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      setPhase("progress")
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || "Failed to save connection.")
    } finally {
      setSaving(false)
    }
  }

  const handleProgressComplete = useCallback((insightsCount: number) => {
    void insightsCount
    revealStartMs.current = Date.now()
    qc.invalidateQueries({ queryKey: ["connections"] })
    setPhase("reveal")
  }, [qc])

  const handleFallback = useCallback((reason: string) => {
    setFallbackReason(reason)
    qc.invalidateQueries({ queryKey: ["connections"] })
    setPhase("fallback")
  }, [qc])

  if (phase === "progress" && savedId) {
    return (
      <OnboardingProgress
        connectionId={savedId}
        onComplete={handleProgressComplete}
        onFallback={handleFallback}
      />
    )
  }

  if (phase === "reveal" && savedId) {
    return (
      <InsightsReveal
        connectionId={savedId}
        databaseName={form.database}
        revealStartMs={revealStartMs.current}
      />
    )
  }

  if (phase === "fallback" && savedId) {
    return <FallbackState connectionId={savedId} reason={fallbackReason} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-8 max-w-2xl mx-auto p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Connect your database</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Querify will read your schema to understand your data.</p>
        </div>

        <Stepper steps={STEPS} current={stepIndex} />

        {phase === "type" && (
          <DbTypeSelector onNext={handleTypeConfirm} />
        )}

        {phase === "form" && (
          <StepDetails
            form={form}
            onChange={updateForm}
            onTestSuccess={handleTestSuccess}
            testPassed={testPassed}
            onNext={() => setPhase("review")}
          />
        )}

        {phase === "review" && (
          <StepReview
            form={form}
            onBack={() => setPhase("form")}
            onSave={handleSave}
            saving={saving}
          />
        )}
      </div>
    </div>
  )
}
