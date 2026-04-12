"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { connections } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { useQueryClient } from "@tanstack/react-query"
import toast from "react-hot-toast"
import Stepper from "@/components/connections/Stepper"
import StepDetails, { type ConnectionFormData } from "@/components/connections/StepDetails"
import StepReview from "@/components/connections/StepReview"
import StepSetup from "@/components/connections/StepSetup"

const STEPS = ["Connection details", "Review", "Setup"]

const DEFAULT_FORM: ConnectionFormData = {
  name: "",
  db_type: "postgres",
  host: "",
  port: 5432,
  database: "",
  username: "",
  password: "",
  ssl_mode: "prefer",
}

export default function NewConnectionPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const setActiveConnection = useAppStore((s) => s.setActiveConnection)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ConnectionFormData>(DEFAULT_FORM)
  const [testPassed, setTestPassed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)

  const updateForm = useCallback((patch: Partial<ConnectionFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }))
    setTestPassed(false)
  }, [])

  const handleTestSuccess = useCallback(() => setTestPassed(true), [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const conn = await connections.create({
        name: form.name,
        host: form.host,
        port: form.port,
        database: form.database,
        username: form.username,
        password: form.password,
        ssl_mode: form.ssl_mode,
      }) as { id: string }
      setSavedId(conn.id)
      setActiveConnection(conn.id)
      await qc.invalidateQueries({ queryKey: ["connections"] })
      setStep(2)
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || "Failed to save connection.")
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = () => {
    qc.invalidateQueries({ queryKey: ["connections"] })
    router.push("/")
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-8 max-w-2xl mx-auto p-6">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text)]">Connect your database</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">Querify will read your schema to understand your data.</p>
        </div>

        <Stepper steps={STEPS} current={step} />

        {step === 0 && (
          <StepDetails
            form={form}
            onChange={updateForm}
            onTestSuccess={handleTestSuccess}
            testPassed={testPassed}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <StepReview
            form={form}
            onBack={() => setStep(0)}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {step === 2 && savedId && (
          <StepSetup connectionId={savedId} onComplete={handleComplete} />
        )}
      </div>
    </div>
  )
}
