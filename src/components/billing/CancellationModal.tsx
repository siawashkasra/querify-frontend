"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, AlertTriangle, Heart, MessageSquare, BarChart2 } from "lucide-react"
import { toast } from "react-hot-toast"
import { cn } from "@/lib/cn"
import { billing } from "@/lib/api"

const REASONS = [
  { value: "too_expensive",      label: "Too expensive" },
  { value: "not_using_enough",   label: "Not using it enough" },
  { value: "missing_feature",    label: "Missing a feature I need" },
  { value: "switching_tool",     label: "Switching to a different tool" },
  { value: "other",              label: "Other" },
] as const

type Reason = (typeof REASONS)[number]["value"]

interface CancellationModalProps {
  open: boolean
  onClose: () => void
  /** Current plan name (e.g. 'pro') — used for win-back messaging */
  planName: string
  /** ISO date string for current_period_end */
  periodEnd: string | null
  /** Called after successful cancellation */
  onCancelled?: () => void
}

export function CancellationModal({
  open,
  onClose,
  planName,
  periodEnd,
  onCancelled,
}: CancellationModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reason, setReason] = useState<Reason | "">("")
  const [reasonDetail, setReasonDetail] = useState("")
  const [loading, setLoading] = useState(false)

  const periodLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "the end of your billing period"

  function reset() {
    setStep(1)
    setReason("")
    setReasonDetail("")
    setLoading(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleCancel() {
    if (!reason) return
    setLoading(true)
    try {
      await billing.cancel(reason, reasonDetail)
      toast.success(`Subscription cancelled. You have access until ${periodLabel}.`, {
        duration: 8000,
      })
      onCancelled?.()
      handleClose()
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message || "Something went wrong."
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleDowngradeToStarter() {
    setLoading(true)
    try {
      await billing.changePlan("starter", "monthly")
      toast.success("Downgraded to Starter — $29/month.")
      handleClose()
    } catch {
      toast.error("Could not downgrade. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v: boolean) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl border border-[var(--border)] bg-white shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200",
          )}
        >
          <Dialog.Close
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </Dialog.Close>

          {/* ── Step 1: Reason ──────────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
                We are sorry to see you go
              </Dialog.Title>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                Tell us why — your feedback helps us improve.
              </p>

              <div className="flex flex-col gap-2 mb-4" role="radiogroup">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors",
                      reason === r.value
                        ? "border-[var(--brand)] bg-violet-50 text-[var(--text)]"
                        : "border-[var(--border)] hover:border-violet-300 text-[var(--text-muted)]"
                    )}
                  >
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-[var(--brand)] w-4 h-4 flex-shrink-0"
                    />
                    {r.label}
                  </label>
                ))}
              </div>

              <textarea
                placeholder="Anything else you'd like to share? (optional)"
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-lg border border-[var(--border)] text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--brand)] mb-5 text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />

              <div className="flex gap-2">
                <button
                  disabled={!reason}
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-lg bg-[var(--brand)] text-white text-sm font-medium py-2.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--brand-hover)] transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] py-2.5 hover:bg-[var(--surface-2)] transition-colors"
                >
                  Keep my subscription
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Win-back ────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-4">
                Before you go…
              </Dialog.Title>

              {reason === "too_expensive" && (
                <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart2 size={16} className="text-violet-500" />
                    <span className="text-sm font-medium text-violet-700">Save 63% — stay on Starter</span>
                  </div>
                  <p className="text-sm text-violet-600 mb-3">
                    Would you stay on the Starter plan at $29/month?
                    You keep exports, insights, and 300 queries.
                  </p>
                  <button
                    disabled={loading}
                    onClick={handleDowngradeToStarter}
                    className="w-full rounded-lg bg-violet-600 text-white text-sm font-medium py-2 hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    Downgrade to Starter
                  </button>
                </div>
              )}

              {reason === "missing_feature" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={16} className="text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">We build what our users ask for</span>
                  </div>
                  <p className="text-sm text-blue-600 mb-3">
                    Tell us what you need — our roadmap is shaped directly by user requests.
                  </p>
                  <a
                    href="mailto:feedback@querify.app?subject=Feature+Request"
                    className="block text-center rounded-lg bg-blue-600 text-white text-sm font-medium py-2 hover:bg-blue-700 transition-colors"
                    onClick={handleClose}
                  >
                    Send feature request
                  </a>
                </div>
              )}

              {(reason === "not_using_enough" || reason === "switching_tool" || reason === "other") && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={16} className="text-green-500" />
                    <span className="text-sm font-medium text-green-700">Your data stays safe</span>
                  </div>
                  <p className="text-sm text-green-600">
                    You can keep your account and come back any time.
                    Your data stays safe for 30 days after cancellation.
                  </p>
                </div>
              )}

              {/* What you'll lose */}
              <div className="rounded-lg border border-[var(--border)] p-4 mb-5">
                <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-3">
                  After cancellation
                </p>
                <ul className="space-y-2 text-sm text-[var(--text-muted)]">
                  <li className="flex justify-between">
                    <span>Database connections</span>
                    <span className="text-amber-600 font-medium">Kept 30 days</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Query history</span>
                    <span className="text-amber-600 font-medium">Kept 30 days</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Insights</span>
                    <span className="text-amber-600 font-medium">Kept 30 days</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Queries/month</span>
                    <span className="font-medium">20 (Free plan)</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 rounded-lg border border-red-300 text-red-600 text-sm font-medium py-2.5 hover:bg-red-50 transition-colors"
                >
                  Continue to cancel
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 rounded-lg bg-[var(--brand)] text-white text-sm font-medium py-2.5 hover:bg-[var(--brand-hover)] transition-colors"
                >
                  Keep my subscription
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Final confirmation ──────────────────────────────────── */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                  Cancel your subscription?
                </Dialog.Title>
              </div>

              <p className="text-sm text-[var(--text-muted)] mb-5">
                Your <strong>{planName}</strong> plan will remain active until{" "}
                <strong>{periodLabel}</strong>. After that you will be on the Free plan
                (20 queries/month).
              </p>

              <div className="flex flex-col gap-2">
                <button
                  disabled={loading}
                  onClick={handleCancel}
                  className="w-full rounded-lg bg-red-600 text-white text-sm font-medium py-2.5 hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Cancelling…" : "Cancel my subscription"}
                </button>
                <button
                  onClick={handleClose}
                  className="w-full text-sm text-[var(--brand)] font-medium py-2 hover:underline transition-colors"
                >
                  Actually, keep my subscription
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
