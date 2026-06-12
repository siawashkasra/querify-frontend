"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import {
  CheckCircle2, ExternalLink, FileText, Loader2,
  AlertTriangle, CreditCard, Zap, ChevronRight,
} from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import { billing as billingApi } from "@/lib/api"
import type { UsageSummary, SubscriptionInfo, PlanChangePreview, InvoiceItem } from "@/lib/api"
import { cn } from "@/lib/cn"
import Badge from "@/components/ui/Badge"
import Button from "@/components/ui/Button"
import { ReactivationBanner } from "@/components/billing/ReactivationBanner"
import { CancellationModal } from "@/components/billing/CancellationModal"

// ── Plan metadata ─────────────────────────────────────────────────────────────

const PLAN_ORDER = ["free", "starter", "pro", "team"] as const
type PlanKey = (typeof PLAN_ORDER)[number]

const PLANS: Record<PlanKey, {
  label: string
  monthlyPrice: number
  annualMonthlyPrice: number
  colorClass: string
  badgeClass: string
  features: string[]
}> = {
  free: {
    label: "Free",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    colorClass: "border-slate-200",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
    features: ["20 queries/month", "1 connection", "1 seat", "7 days history"],
  },
  starter: {
    label: "Starter",
    monthlyPrice: 29,
    annualMonthlyPrice: 24,
    colorClass: "border-blue-200",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    features: ["300 queries/month", "2 connections", "3 seats", "90 days history", "Exports & Insights"],
  },
  pro: {
    label: "Pro",
    monthlyPrice: 79,
    annualMonthlyPrice: 66,
    colorClass: "border-violet-300",
    badgeClass: "bg-violet-soft text-violet border-violet-200",
    features: ["Unlimited queries", "Unlimited connections", "10 seats", "365 days history", "API access"],
  },
  team: {
    label: "Team",
    monthlyPrice: 199,
    annualMonthlyPrice: 166,
    colorClass: "border-teal-200",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    features: ["Unlimited queries", "Unlimited connections", "Unlimited seats", "365 days history", "API access"],
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
}

function barColor(pct: number) {
  if (pct >= 0.9) return "bg-red-500"
  if (pct >= 0.7) return "bg-amber-400"
  return "bg-green-500"
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan, className }: { plan: string; className?: string }) {
  const meta = PLANS[plan as PlanKey]
  if (!meta) return null
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border", meta.badgeClass, className)}>
      {meta.label}
    </span>
  )
}

// ── Usage meter ───────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, resetDate }: {
  label: string
  used: number
  limit: number | null
  resetDate?: string | null
}) {
  if (limit === null) {
    return (
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-[var(--text-muted)]">{label}</span>
        <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
          <CheckCircle2 size={14} />
          Unlimited
        </div>
      </div>
    )
  }
  const pct = limit > 0 ? used / limit : 0
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex justify-between text-sm">
        <span className="text-[var(--text-muted)]">{label}</span>
        <span className="font-medium text-[var(--text)]">{used} / {limit}</span>
      </div>
      <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor(pct))}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
      {resetDate && (
        <p className="text-xs text-[var(--text-muted)]">Resets on {fmtDate(resetDate)}</p>
      )}
    </div>
  )
}

// ── Plan change preview modal ─────────────────────────────────────────────────

interface PlanChangeModalProps {
  targetPlan: PlanKey | null
  billingPeriod: "monthly" | "annual"
  onClose: () => void
  onSuccess: () => void
}

function PlanChangeModal({ targetPlan, billingPeriod, onClose, onSuccess }: PlanChangeModalProps) {
  const qc = useQueryClient()
  const router = useRouter()

  const { data: preview, isLoading: previewLoading } = useQuery<PlanChangePreview>({
    queryKey: ["billing-preview", targetPlan, billingPeriod],
    queryFn: () => billingApi.planPreview(targetPlan!, billingPeriod) as Promise<PlanChangePreview>,
    enabled: !!targetPlan,
  })

  const { mutate: confirmChange, isPending } = useMutation({
    mutationFn: () => billingApi.changePlan(targetPlan!, billingPeriod),
    onSuccess: (result) => {
      if (result.redirect && result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      toast.success(result.message)
      qc.invalidateQueries({ queryKey: ["billing-subscription"] })
      qc.invalidateQueries({ queryKey: ["billing-usage"] })
      onSuccess()
      onClose()
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Plan change failed. Please try again.")
    },
  })

  if (!targetPlan) return null
  const meta = PLANS[targetPlan]
  const isUpgrade = preview?.is_upgrade ?? true

  return (
    <Dialog.Root open={!!targetPlan} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-md rounded-xl border bg-white shadow-xl p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200",
          meta.colorClass,
        )}>
          <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
            {isUpgrade ? "Upgrade to" : "Downgrade to"} {meta.label}
          </Dialog.Title>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            {isUpgrade ? "Effective immediately." : `Takes effect on ${fmtDate(preview?.effective_date)}.`}
          </p>

          {previewLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-4">
              <Loader2 size={14} className="animate-spin" />
              Calculating…
            </div>
          ) : preview ? (
            <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] mb-5">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-muted)]">Due today</span>
                <span className={cn("font-semibold", preview.amount_due_now < 0 ? "text-green-600" : "text-[var(--text)]")}>
                  {preview.amount_due_now < 0
                    ? `−${fmt(-preview.amount_due_now)} credit`
                    : preview.amount_due_now === 0
                    ? "Nothing"
                    : fmt(preview.amount_due_now)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-muted)]">Next invoice</span>
                <span className="font-medium text-[var(--text)]">
                  {fmt(preview.next_invoice_amount)}
                  {preview.next_invoice_date && (
                    <span className="text-[var(--text-muted)] font-normal ml-1">
                      on {fmtDate(preview.next_invoice_date)}
                    </span>
                  )}
                </span>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Button
              variant="primary"
              disabled={previewLoading || isPending}
              loading={isPending}
              onClick={() => confirmChange()}
              className="w-full"
            >
              Confirm {isUpgrade ? "upgrade" : "downgrade"} to {meta.label}
            </Button>
            <button onClick={onClose} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] py-2 transition-colors">
              Cancel
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan, billingPeriod, currentPlan, onSelect, pending,
}: {
  plan: PlanKey
  billingPeriod: "monthly" | "annual"
  currentPlan: string
  onSelect: (plan: PlanKey) => void
  pending?: string | null
}) {
  const meta = PLANS[plan]
  const isCurrent = plan === currentPlan
  const currentRank = PLAN_ORDER.indexOf(currentPlan as PlanKey)
  const thisRank = PLAN_ORDER.indexOf(plan)
  const isUpgrade = thisRank > currentRank
  const isDowngrade = thisRank < currentRank
  const price = billingPeriod === "annual" ? meta.annualMonthlyPrice : meta.monthlyPrice

  return (
    <div className={cn(
      "rounded-xl border p-5 flex flex-col gap-4 transition-shadow",
      isCurrent ? `${meta.colorClass} shadow-float` : "border-[var(--border)] hover:shadow-rest",
    )}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-[var(--text)]">{meta.label}</span>
        {isCurrent && (
          <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-0.5">
            Current plan
          </span>
        )}
      </div>

      <div>
        {price === 0 ? (
          <span className="text-2xl font-bold text-[var(--text)]">Free</span>
        ) : (
          <>
            <span className="text-2xl font-bold text-[var(--text)]">${price}</span>
            <span className="text-sm text-[var(--text-muted)]">/month</span>
            {billingPeriod === "annual" && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5">billed annually</p>
            )}
          </>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {meta.features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {pending === plan && (
        <p className="text-xs text-amber-600">Pending downgrade — effective {fmtDate(undefined)}</p>
      )}

      {!isCurrent && (
        <Button
          variant={isUpgrade ? "primary" : "secondary"}
          size="sm"
          onClick={() => onSelect(plan)}
          className="w-full"
        >
          {isUpgrade ? "Upgrade" : "Downgrade"}
          {!isUpgrade && <span className="text-xs opacity-60 ml-1">(at period end)</span>}
        </Button>
      )}
    </div>
  )
}

// ── Billing page ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const qc = useQueryClient()
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
  const [targetPlan, setTargetPlan] = useState<PlanKey | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)

  const { data: sub, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["billing-subscription"],
    queryFn: () => billingApi.subscription() as Promise<SubscriptionInfo>,
    staleTime: 30_000,
  })

  const { data: usage, isLoading: usageLoading } = useQuery<UsageSummary>({
    queryKey: ["billing-usage"],
    queryFn: () => billingApi.usage() as Promise<UsageSummary>,
    staleTime: 0, // always fresh
  })

  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceItem[]>({
    queryKey: ["billing-invoices"],
    queryFn: () => billingApi.invoices() as Promise<InvoiceItem[]>,
    staleTime: 60_000,
  })

  const { mutate: openPortal, isPending: portalPending } = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (res) => { window.location.href = (res as { portal_url: string }).portal_url },
    onError: () => toast.error("Could not open billing portal."),
  })

  const planName = sub?.plan_name ?? "free"
  const isPaid = planName !== "free"
  const isCancelled = !!sub?.cancelled_at
  const periodEnd = sub?.current_period_end ?? null

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Back nav */}
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Link href="/settings" className="hover:text-[var(--text)] transition-colors">Settings</Link>
          <ChevronRight size={14} />
          <span className="text-[var(--text)]">Billing</span>
        </div>

        <h1 className="text-lg font-semibold text-[var(--text)] -mt-4">Billing</h1>

        {/* Reactivation banner */}
        {isCancelled && periodEnd && (
          <ReactivationBanner
            periodEnd={periodEnd}
            onReactivated={() => qc.invalidateQueries({ queryKey: ["billing-subscription"] })}
          />
        )}

        {/* ── Current plan ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Current plan</p>

          {subLoading ? (
            <div className="h-16 rounded-lg bg-[var(--surface-2)] animate-pulse" />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <PlanBadge plan={planName} />
              {isCancelled && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                  <AlertTriangle size={11} />
                  Cancellation pending
                </span>
              )}
              {sub?.status === "past_due" && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-red-50 text-red-600 border-red-200">
                  Past due
                </span>
              )}
              <span className="text-sm text-[var(--text-muted)] ml-auto">
                {sub?.billing_period === "annual" ? "Annual" : "Monthly"}
                {periodEnd && (
                  <>
                    {" · "}
                    {isCancelled ? "Access until" : "Renews"}{" "}
                    <span className="font-medium text-[var(--text)]">{fmtDate(periodEnd)}</span>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Pending downgrade notice */}
          {sub?.pending_plan_change && (
            <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Downgrade to <strong>{PLANS[sub.pending_plan_change as PlanKey]?.label ?? sub.pending_plan_change}</strong> scheduled
              for {fmtDate(sub.pending_change_date)}.
            </p>
          )}
        </section>

        {/* ── Usage meters ─────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">Usage this period</p>

          {usageLoading ? (
            <div className="flex flex-col gap-3 pt-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-8 rounded bg-[var(--surface-2)] animate-pulse" />)}
            </div>
          ) : usage ? (
            <div className="divide-y divide-[var(--border)]">
              <UsageMeter
                label="Queries"
                used={usage.queries_used}
                limit={usage.query_limit}
                resetDate={usage.period_end}
              />
              <UsageMeter label="Connections" used={usage.connections_used} limit={usage.connection_limit} />
              <UsageMeter label="Team seats" used={usage.seats_used} limit={usage.seat_limit} />
            </div>
          ) : null}
        </section>

        {/* ── Plan cards ───────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Plans</p>
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              {(["monthly", "annual"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setBillingPeriod(p)}
                  className={cn(
                    "px-3 py-1 rounded text-xs font-medium transition-colors capitalize",
                    billingPeriod === p
                      ? "bg-white shadow-rest text-[var(--text)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-dim)]"
                  )}
                >
                  {p === "annual" ? "Annual (save 17%)" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLAN_ORDER.map((plan) => (
              <PlanCard
                key={plan}
                plan={plan}
                billingPeriod={billingPeriod}
                currentPlan={planName}
                onSelect={setTargetPlan}
                pending={sub?.pending_plan_change}
              />
            ))}
          </div>
        </section>

        {/* ── Payment method ───────────────────────────────────────────────── */}
        {isPaid && sub?.stripe_customer_id && (
          <section className="rounded-xl border border-[var(--border)] bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Payment method</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-7 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center">
                  <CreditCard size={14} className="text-[var(--text-muted)]" />
                </div>
                <span className="text-sm text-[var(--text-muted)]">Manage via Stripe portal</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={portalPending}
                onClick={() => openPortal()}
              >
                <ExternalLink size={12} />
                Update payment method
              </Button>
            </div>
          </section>
        )}

        {/* ── Invoice history ──────────────────────────────────────────────── */}
        <section className="rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">Invoice history</p>

          {invoicesLoading ? (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-[var(--surface-2)] animate-pulse" />)}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)] border-b border-[var(--border)]">
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-right font-medium">Amount</th>
                  <th className="pb-2 text-right font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-3 text-[var(--text-muted)]">
                      {new Date(inv.created * 1000).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-right font-medium text-[var(--text)]">
                      {fmt(inv.amount_paid)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border capitalize",
                        inv.status === "paid"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]"
                      )}>
                        {inv.status ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {inv.invoice_pdf ? (
                        <a
                          href={inv.invoice_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[var(--brand)] hover:underline"
                        >
                          <FileText size={12} />
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
              No invoices yet. Your first invoice will appear after payment.
            </p>
          )}
        </section>

        {/* ── Danger zone ──────────────────────────────────────────────────── */}
        {isPaid && !isCancelled && (
          <div className="flex justify-end pt-2 pb-6">
            <button
              onClick={() => setCancelOpen(true)}
              className="text-xs text-[var(--text-muted)] hover:text-danger transition-colors underline underline-offset-2"
            >
              Cancel subscription
            </button>
          </div>
        )}

      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <PlanChangeModal
        targetPlan={targetPlan}
        billingPeriod={billingPeriod}
        onClose={() => setTargetPlan(null)}
        onSuccess={() => {}}
      />

      <CancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        planName={PLANS[planName as PlanKey]?.label ?? planName}
        periodEnd={periodEnd}
        onCancelled={() => qc.invalidateQueries({ queryKey: ["billing-subscription"] })}
      />
    </div>
  )
}
