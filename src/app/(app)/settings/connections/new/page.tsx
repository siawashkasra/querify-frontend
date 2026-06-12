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
import { ModelConfirmCard } from "@/components/onboarding/ModelConfirmCard"
import { InsightsReveal, FallbackState } from "@/components/onboarding/InsightsReveal"

type Phase = "type" | "form" | "review" | "progress" | "confirm" | "reveal" | "fallback"

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
  // FIX 2 — one connection per database: when the backend says this database is
  // already connected, prompt to open or replace instead of silently duplicating.
  const [duplicate, setDuplicate] = useState<{ connectionId: string; name: string } | null>(null)
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

  const doCreate = async (replaceExisting: boolean) => {
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
        ...(replaceExisting ? { replace_existing: true } : {}),
        ...(Object.keys(extra_params).length > 0 ? { extra_params } : {}),
      }) as { id: string }
      setDuplicate(null)
      setSavedId(conn.id)
      setActiveConnection(conn.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      setPhase("progress")
    } catch (err: unknown) {
      const e = err as { error_type?: string; message?: string; connection_id?: string; name?: string }
      if (e.error_type === "ALREADY_CONNECTED" && e.connection_id) {
        setDuplicate({ connectionId: e.connection_id, name: e.name || "this database" })
      } else {
        toast.error(e.message || "Failed to save connection.")
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSave = () => doCreate(false)

  const handleOpenExisting = () => {
    if (!duplicate) return
    setActiveConnection(duplicate.connectionId)
    setDuplicate(null)
    router.push("/dashboard")
  }

  const handleProgressComplete = useCallback((insightsCount: number, requiresConfirmation: boolean) => {
    void insightsCount
    qc.invalidateQueries({ queryKey: ["connections"] })
    if (requiresConfirmation) {
      // the differentiator: show what was understood before revealing anything
      setPhase("confirm")
    } else {
      revealStartMs.current = Date.now()
      setPhase("reveal")
    }
  }, [qc])

  const handleModelConfirmed = useCallback((dashboardReady: boolean) => {
    void dashboardReady
    revealStartMs.current = Date.now()
    qc.invalidateQueries({ queryKey: ["connections"] })
    qc.invalidateQueries({ queryKey: ["dashboard"] })
    qc.invalidateQueries({ queryKey: ["briefing"] })
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

  if (phase === "confirm" && savedId) {
    return (
      <ModelConfirmCard
        connectionId={savedId}
        onConfirmed={handleModelConfirmed}
        onSkip={() => handleModelConfirmed(false)}
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
    return (
      <FallbackState
        connectionId={savedId}
        reason={fallbackReason}
        onRetry={() => setPhase("progress")}
      />
    )
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

      {/* FIX 2 — duplicate database prompt: open the existing one or replace it */}
      {duplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h3 className="text-base font-semibold text-[var(--text)]">This database is already connected</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
              It&apos;s already connected as <strong>{duplicate.name}</strong>. You can open the existing
              connection, or replace it to re-onboard with these credentials — no duplicate will be created.
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setDuplicate(null)}
                className="rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleOpenExisting}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--text)] hover:border-brand hover:text-brand transition-colors"
              >
                Open existing
              </button>
              <button
                onClick={() => doCreate(true)}
                disabled={saving}
                className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-brand/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Replacing…" : "Replace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
