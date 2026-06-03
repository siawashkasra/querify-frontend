"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, X, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { adminApi } from "@/lib/adminApi"
import type { PlanOverrideRequest } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Plan definitions ──────────────────────────────────────────────────────────

const PLANS = [
  { name: "free" as const,    label: "Free",    price: "$0/mo",  queries: "20 queries" },
  { name: "starter" as const, label: "Starter", price: "$29/mo", queries: "300 queries" },
  { name: "pro" as const,     label: "Pro",     price: "$79/mo", queries: "Unlimited" },
  { name: "team" as const,    label: "Team",    price: "$199/mo", queries: "Unlimited" },
] as const

const DURATIONS: { label: string; days: number | null }[] = [
  { label: "7 days — Trial",   days: 7 },
  { label: "14 days",          days: 14 },
  { label: "30 days",          days: 30 },
  { label: "90 days",          days: 90 },
  { label: "Permanent",        days: null },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface PlanOverrideModalProps {
  tenantId: string
  tenantName: string
  currentPlan: string
  onClose: () => void
  onSuccess?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanOverrideModal({
  tenantId,
  tenantName,
  currentPlan,
  onClose,
  onSuccess,
}: PlanOverrideModalProps) {
  const qc = useQueryClient()
  const [selectedPlan, setSelectedPlan] = useState<PlanOverrideRequest["plan_name"] | null>(null)
  const [durationDays, setDurationDays] = useState<number | null>(30)
  const [reason, setReason] = useState("")
  const [confirmed, setConfirmed] = useState(false)

  const mutation = useMutation({
    mutationFn: (body: PlanOverrideRequest) => adminApi.setTenantPlan(tenantId, body),
    onSuccess: (data) => {
      const durationLabel = durationDays ? `Expires in ${durationDays} days` : "Permanent"
      toast.success(`Plan set to ${data.plan_name} for ${tenantName}. ${durationLabel}.`)
      qc.invalidateQueries({ queryKey: ["admin-tenant-billing", tenantId] })
      qc.invalidateQueries({ queryKey: ["admin-tenants"] })
      qc.invalidateQueries({ queryKey: ["admin-tenant-overview", tenantId] })
      onSuccess?.()
      onClose()
    },
    onError: (err: unknown) => {
      const msg = (err as { message?: string })?.message ?? "Failed to set plan"
      toast.error(msg)
    },
  })

  const canSubmit =
    selectedPlan !== null &&
    reason.trim().length >= 10 &&
    confirmed &&
    !mutation.isPending

  const handleSubmit = () => {
    if (!selectedPlan || !canSubmit) return
    mutation.mutate({ plan_name: selectedPlan, reason: reason.trim(), duration_days: durationDays })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Set plan</h2>
            <p className="text-sm text-gray-500">{tenantName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Warning */}
          <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
            <AlertTriangle size={16} className="shrink-0 text-amber-500 mt-0.5" />
            <p className="text-sm text-amber-800 leading-relaxed">
              This bypasses Stripe. The tenant will <strong>not be charged</strong>.
              Use for trials, support credits, and testing only.
            </p>
          </div>

          {/* Plan selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Plan
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLANS.map((p) => {
                const isCurrent = p.name === currentPlan.toLowerCase()
                const isSelected = p.name === selectedPlan
                return (
                  <button
                    key={p.name}
                    onClick={() => setSelectedPlan(p.name)}
                    className={cn(
                      "relative flex flex-col gap-1 rounded-xl border-2 px-3 py-3 text-left transition-all",
                      isSelected
                        ? "border-brand bg-brand/5"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    )}
                  >
                    {isCurrent && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold bg-green-500 text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                        current
                      </span>
                    )}
                    <span className={cn("text-sm font-semibold", isSelected ? "text-brand" : "text-gray-800")}>
                      {p.label}
                    </span>
                    <span className="text-xs text-gray-500">{p.price}</span>
                    <span className="text-[11px] text-gray-400">{p.queries}</span>
                    {isSelected && (
                      <CheckCircle2 size={14} className="absolute top-2 right-2 text-brand" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Duration
            </label>
            <div className="flex flex-col gap-1.5">
              {DURATIONS.map((d) => (
                <label key={String(d.days)} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="duration"
                    checked={durationDays === d.days}
                    onChange={() => setDurationDays(d.days)}
                    className="accent-brand"
                  />
                  <span className="text-sm text-gray-700">{d.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. 30-day trial for demo call on 2026-06-01"
              rows={3}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-sm resize-none outline-none transition-colors",
                reason.trim().length > 0 && reason.trim().length < 10
                  ? "border-red-300 focus:border-red-400"
                  : "border-gray-200 focus:border-brand"
              )}
            />
            <div className="flex items-center justify-between">
              {reason.trim().length > 0 && reason.trim().length < 10 ? (
                <p className="text-xs text-red-500">Minimum 10 characters</p>
              ) : (
                <span />
              )}
              <p className="text-xs text-gray-400">{reason.length} chars</p>
            </div>
          </div>

          {/* Confirm checkbox */}
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-brand"
            />
            <span className="text-sm text-gray-600 leading-relaxed">
              I understand this tenant will <strong>not be charged via Stripe</strong>.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-colors",
              canSubmit ? "bg-brand hover:bg-brand-dark" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanOverrideModal
