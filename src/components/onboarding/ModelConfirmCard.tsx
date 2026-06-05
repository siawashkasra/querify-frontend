"use client"

// The onboarding differentiator: after the semantic model is built and
// value-grounded, SHOW the user what was understood in plain English and let
// them correct any mapping in one sentence before the dashboard is seeded.

import { useCallback, useEffect, useState } from "react"
import { Check, CircleDollarSign, Database, Loader2, Pencil, Sparkles } from "lucide-react"
import toast from "react-hot-toast"
import { connections } from "@/lib/api"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/cn"
import type { ModelSummary } from "@/types"

export interface ModelConfirmCardProps {
  connectionId: string
  onConfirmed: (dashboardReady: boolean) => void
  onSkip: () => void  // model unavailable — continue without blocking onboarding
}

export const ModelConfirmCard = ({ connectionId, onConfirmed, onSkip }: ModelConfirmCardProps) => {
  const [summary, setSummary] = useState<ModelSummary | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [correction, setCorrection] = useState("")
  const [showCorrection, setShowCorrection] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [ack, setAck] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    connections.modelSummary(connectionId)
      .then((s) => { if (!cancelled) setSummary(s) })
      .catch(() => { if (!cancelled) setLoadFailed(true) })
    return () => { cancelled = true }
  }, [connectionId])

  const confirm = useCallback(async (withCorrection: boolean) => {
    setSubmitting(true)
    try {
      const res = await connections.confirmModel(connectionId, withCorrection ? correction.trim() : undefined)
      track("onboarding_model_confirmed", { connection_id: connectionId, corrected: withCorrection })
      if (withCorrection) {
        setAck(res.ack)
        setSummary(res.model)
        setCorrection("")
        setShowCorrection(false)
        if (res.rejected?.length) toast(res.rejected.join("\n"), { icon: "⚠️" })
      }
      // confirmed either way — hand off to the populated dashboard
      setTimeout(() => onConfirmed(res.dashboard_ready), withCorrection ? 900 : 0)
    } catch {
      toast.error(withCorrection
        ? "I couldn't apply that correction — try naming the table or column."
        : "Could not confirm — please try again.")
      setSubmitting(false)
    }
  }, [connectionId, correction, onConfirmed])

  if (loadFailed) {
    // never trap the user — model summary unavailable, continue gracefully
    onSkip()
    return null
  }

  if (!summary) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)]">
        <Loader2 size={20} className="animate-spin text-brand" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] overflow-y-auto">
      <div className="w-full max-w-[560px] px-8 py-10 flex flex-col gap-6 animate-fade-slide-in">
        <div className="flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-brand">
            <Sparkles size={13} /> Here&apos;s what I understood
          </span>
          <h2 className="text-xl font-semibold text-[var(--text)]">{summary.business_summary}</h2>
          <p className="text-sm text-[var(--text-muted)]">Verified against your real data — does this look right?</p>
        </div>

        {/* plain-English readings */}
        <ul className="flex flex-col gap-2">
          {summary.readings.map((r, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text-dim)] leading-relaxed animate-fade-slide-in"
                style={{ animationDelay: `${i * 60}ms` }}>
              {r.startsWith("I read") && r.includes("(money)")
                ? <CircleDollarSign size={15} className="mt-0.5 shrink-0 text-brand" />
                : <Database size={15} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />}
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {/* dashboard preview */}
        {!!summary.dashboard_preview?.length && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Your dashboard will lead with</span>
            <div className="flex flex-wrap gap-2">
              {summary.dashboard_preview.map((m, i) => (
                <span key={i} className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--text-dim)]">
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {ack && (
          <p className="flex items-start gap-2 rounded-lg border-l-[3px] border-success bg-success-bg px-3.5 py-3 text-sm text-[var(--text-dim)] animate-fade-slide-in">
            <Check size={15} className="mt-0.5 shrink-0 text-success" /> {ack}
          </p>
        )}

        {/* one-sentence correction */}
        {showCorrection ? (
          <div className="flex flex-col gap-2 animate-fade-slide-in">
            <textarea
              autoFocus
              rows={2}
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder={'e.g. "Revenue should be amount_paid on invoices, not total_amount"'}
              className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-brand focus:outline-none resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={() => confirm(true)}
                disabled={submitting || !correction.trim()}
                className={cn("rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity",
                  (submitting || !correction.trim()) && "opacity-50")}
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : "Apply correction"}
              </button>
              <button onClick={() => setShowCorrection(false)} disabled={submitting}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-dim)]">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => confirm(false)}
              disabled={submitting}
              className={cn("flex items-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:opacity-90",
                submitting && "opacity-50")}
              data-testid="confirm-model"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} />}
              Looks right — build my dashboard
            </button>
            <button
              onClick={() => setShowCorrection(true)}
              disabled={submitting}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-brand transition-colors"
            >
              <Pencil size={13} /> Correct something
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModelConfirmCard
