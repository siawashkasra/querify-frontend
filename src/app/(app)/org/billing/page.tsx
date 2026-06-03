"use client"

import { Suspense, useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2, ExternalLink, FileText, CreditCard,
  Loader2, AlertTriangle, Zap, ChevronRight, Download,
  Wifi, Minus,
} from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import toast from "react-hot-toast"
import { billing as billingApi, tenant as tenantApi } from "@/lib/api"
import type {
  SubscriptionInfo, UsageSummary, PlanChangePreview,
  InvoiceItem, PaymentMethod, TenantInfo,
} from "@/lib/api"
import { ReactivationBanner } from "@/components/billing/ReactivationBanner"
import Button from "@/components/ui/Button"
import Spinner from "@/components/ui/Spinner"
import { cn } from "@/lib/cn"

// ── Plan metadata ─────────────────────────────────────────────────────────────

const PLAN_ORDER = ["free", "starter", "pro", "team"] as const
type PlanKey = (typeof PLAN_ORDER)[number]

const PLANS: Record<PlanKey, {
  label: string
  monthlyPrice: number
  annualMonthlyPrice: number
  accentClass: string
  badgeClass: string
  features: string[]
  limits: { queries: string; connections: string; seats: string; history: string }
}> = {
  free: {
    label: "Free",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    accentClass: "border-slate-200",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-300",
    features: ["20 queries / month", "1 database connection", "1 seat", "7-day query history", "Basic chat interface"],
    limits: { queries: "20/mo", connections: "1", seats: "1", history: "7 days" },
  },
  starter: {
    label: "Starter",
    monthlyPrice: 29,
    annualMonthlyPrice: 24,
    accentClass: "border-blue-300",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    features: ["300 queries / month", "2 database connections", "3 seats", "90-day query history", "Exports & AI Insights"],
    limits: { queries: "300/mo", connections: "2", seats: "3", history: "90 days" },
  },
  pro: {
    label: "Pro",
    monthlyPrice: 79,
    annualMonthlyPrice: 66,
    accentClass: "border-violet-300",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    features: ["Unlimited queries", "Unlimited connections", "10 seats", "365-day history", "API access + webhooks"],
    limits: { queries: "Unlimited", connections: "Unlimited", seats: "10", history: "365 days" },
  },
  team: {
    label: "Team",
    monthlyPrice: 199,
    annualMonthlyPrice: 166,
    accentClass: "border-teal-300",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
    features: ["Unlimited queries", "Unlimited connections", "Unlimited seats", "365-day history", "Priority support"],
    limits: { queries: "Unlimited", connections: "Unlimited", seats: "Unlimited", history: "365 days" },
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

const CARD_BRAND_ICONS: Record<string, string> = {
  visa: "VISA", mastercard: "MC", amex: "AMEX",
  discover: "DISC", jcb: "JCB", unionpay: "UP",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-[var(--surface-2)]", className)} />
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-4">
      {children}
    </p>
  )
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan: string }) {
  const meta = PLANS[plan as PlanKey]
  if (!meta) return null
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border", meta.badgeClass)}>
      {meta.label}
    </span>
  )
}

// ── Upgrade success toast (shown when returning from Stripe checkout) ──────────

function useCheckoutSuccess() {
  const sp = useSearchParams()
  const qc = useQueryClient()
  useEffect(() => {
    const sessionId = sp.get("session_id")
    if (!sessionId) return
    billingApi.checkoutSuccess(sessionId)
      .then((res: { plan_name: string; status: string; message: string }) => {
        toast.success(`Plan upgraded to ${PLANS[res.plan_name as PlanKey]?.label ?? res.plan_name}. Your new limits are active.`, { duration: 8000 })
        qc.invalidateQueries({ queryKey: ["billing-subscription"] })
        qc.invalidateQueries({ queryKey: ["billing-usage"] })
      })
      .catch(() => {})
    // Replace URL to strip session_id
    window.history.replaceState({}, "", "/org/billing")
  }, []) // only run once on mount
}

// ── Plan change modal ─────────────────────────────────────────────────────────

function PlanChangeModal({
  targetPlan, billingPeriod, currentPlan, periodEnd, onClose,
}: {
  targetPlan: PlanKey | null
  billingPeriod: "monthly" | "annual"
  currentPlan: string
  periodEnd: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()

  const { data: preview, isLoading } = useQuery<PlanChangePreview>({
    queryKey: ["billing-preview", targetPlan, billingPeriod],
    queryFn: () => billingApi.planPreview(targetPlan!, billingPeriod) as Promise<PlanChangePreview>,
    enabled: !!targetPlan,
  })

  const { mutate: confirm, isPending } = useMutation({
    mutationFn: () => billingApi.changePlan(targetPlan!, billingPeriod),
    onSuccess: (res) => {
      if (res.redirect && res.checkout_url) {
        window.location.href = res.checkout_url
        return
      }
      toast.success(res.message)
      qc.invalidateQueries({ queryKey: ["billing-subscription"] })
      qc.invalidateQueries({ queryKey: ["billing-usage"] })
      onClose()
    },
    onError: (err: { message?: string }) => toast.error(err.message || "Plan change failed."),
  })

  if (!targetPlan) return null

  const meta = PLANS[targetPlan]
  const currentMeta = PLANS[currentPlan as PlanKey]
  const isUpgrade = PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan as PlanKey)

  const LimitRow = ({ label, from, to }: { label: string; from: string; to: string }) => (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="flex items-center gap-1.5">
        <span className={cn("font-medium", isUpgrade ? "text-[var(--text-muted)] line-through" : "text-[var(--text)]")}>{from}</span>
        <ChevronRight size={10} className="text-[var(--text-muted)]" />
        <span className={cn("font-medium", isUpgrade ? "text-success" : "text-warning")}>{to}</span>
      </span>
    </div>
  )

  return (
    <Dialog.Root open={!!targetPlan} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-md rounded-xl border bg-[var(--bg)] shadow-xl p-6",
          meta.accentClass
        )}>
          <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
            {isUpgrade ? "Upgrade to" : "Downgrade to"} {meta.label}
          </Dialog.Title>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            {isUpgrade
              ? "Effective immediately. Your new limits will be active right away."
              : `Takes effect on ${fmtDate(periodEnd ?? preview?.effective_date)}. You keep your current plan until then.`}
          </p>

          {/* Limit changes */}
          {currentMeta && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2 mb-4 divide-y divide-[var(--border)]">
              <LimitRow label="Queries" from={currentMeta.limits.queries} to={meta.limits.queries} />
              <LimitRow label="Connections" from={currentMeta.limits.connections} to={meta.limits.connections} />
              <LimitRow label="Seats" from={currentMeta.limits.seats} to={meta.limits.seats} />
              <LimitRow label="History" from={currentMeta.limits.history} to={meta.limits.history} />
            </div>
          )}

          {/* Pricing */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] py-2">
              <Loader2 size={13} className="animate-spin" /> Calculating…
            </div>
          ) : preview && (
            <div className="rounded-lg border border-[var(--border)] divide-y divide-[var(--border)] mb-5">
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-muted)]">Due today</span>
                <span className={cn("font-semibold", preview.amount_due_now < 0 ? "text-success" : "text-[var(--text)]")}>
                  {preview.amount_due_now < 0
                    ? `−${fmt(-preview.amount_due_now)} credit`
                    : preview.amount_due_now === 0 ? "Nothing"
                    : fmt(preview.amount_due_now)}
                </span>
              </div>
              <div className="flex justify-between px-4 py-3 text-sm">
                <span className="text-[var(--text-muted)]">Next invoice</span>
                <span className="font-medium text-[var(--text)]">
                  {fmt(preview.next_invoice_amount)}
                  {preview.next_invoice_date && (
                    <span className="text-[var(--text-muted)] font-normal ml-1">on {fmtDate(preview.next_invoice_date)}</span>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant={isUpgrade ? "primary" : "secondary"}
              disabled={isLoading || isPending}
              loading={isPending}
              onClick={() => confirm()}
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

// ── Enhanced cancellation modal (with org name confirmation) ──────────────────

const CANCEL_REASONS = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using_enough", label: "Not using it enough" },
  { value: "missing_feature", label: "Missing a feature I need" },
  { value: "switching_tool", label: "Switching to a different tool" },
  { value: "other", label: "Other" },
] as const

type CancelReason = (typeof CANCEL_REASONS)[number]["value"]

function OrgCancellationModal({
  open, onClose, planName, periodEnd, orgName, onCancelled,
}: {
  open: boolean
  onClose: () => void
  planName: string
  periodEnd: string | null
  orgName: string
  onCancelled: () => void
}) {
  const qc = useQueryClient()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [reason, setReason] = useState<CancelReason | "">("")
  const [reasonDetail, setReasonDetail] = useState("")
  const [confirmInput, setConfirmInput] = useState("")
  const [cancelled, setCancelled] = useState(false)

  const { mutate: cancel, isPending } = useMutation({
    mutationFn: () => billingApi.cancel(reason, reasonDetail),
    onSuccess: () => {
      setCancelled(true)
      setStep(3)
      qc.invalidateQueries({ queryKey: ["billing-subscription"] })
      onCancelled()
    },
    onError: (err: { message?: string }) => toast.error(err.message || "Cancellation failed."),
  })

  const { mutate: reactivate, isPending: reactivating } = useMutation({
    mutationFn: () => billingApi.reactivate(),
    onSuccess: () => {
      toast.success("Subscription reactivated!")
      setCancelled(false)
      setStep(1)
      qc.invalidateQueries({ queryKey: ["billing-subscription"] })
      onClose()
    },
    onError: () => toast.error("Could not reactivate."),
  })

  const periodLabel = periodEnd
    ? new Date(periodEnd).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })
    : "the end of your billing period"

  function handleClose() {
    if (!cancelled) { setStep(1); setReason(""); setReasonDetail(""); setConfirmInput("") }
    onClose()
  }

  const canConfirm = confirmInput === orgName

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xl p-6">

          {/* Step 1 — Reason */}
          {step === 1 && (
            <>
              <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
                We're sorry to see you go
              </Dialog.Title>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                Tell us why — your feedback helps us improve Querify.
              </p>
              <div className="flex flex-col gap-2 mb-4">
                {CANCEL_REASONS.map((r) => (
                  <label key={r.value} className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border text-sm cursor-pointer transition-colors",
                    reason === r.value
                      ? "border-brand bg-brand/5 text-[var(--text)]"
                      : "border-[var(--border)] hover:border-brand/30 text-[var(--text-muted)]"
                  )}>
                    <input
                      type="radio"
                      name="cancel-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-brand w-4 h-4 shrink-0"
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
                className="w-full rounded-lg border border-[var(--border)] text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand mb-5 text-[var(--text)] placeholder:text-[var(--text-muted)] bg-[var(--bg)]"
              />
              <div className="flex gap-2">
                <Button disabled={!reason} onClick={() => setStep(2)} className="flex-1">Next</Button>
                <Button variant="secondary" onClick={handleClose} className="flex-1">Keep my subscription</Button>
              </div>
            </>
          )}

          {/* Step 2 — Confirmation with org name */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-danger/10 border border-danger/20 flex items-center justify-center shrink-0">
                  <AlertTriangle size={18} className="text-danger" />
                </div>
                <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                  Confirm cancellation
                </Dialog.Title>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 mb-5 text-sm text-[var(--text-muted)] space-y-2">
                <p>
                  Your <strong className="text-[var(--text)]">{planName}</strong> subscription will cancel on{" "}
                  <strong className="text-[var(--text)]">{periodLabel}</strong>.
                </p>
                <p>After that, you will be on the <strong className="text-[var(--text)]">Free plan</strong> (20 queries/month).</p>
                <p>Your data will be retained for <strong className="text-[var(--text)]">30 days</strong> after cancellation.</p>
              </div>

              <div className="mb-5">
                <label className="text-xs font-medium text-[var(--text-dim)] block mb-1.5">
                  Type <span className="font-mono font-bold text-[var(--text)]">{orgName}</span> to confirm
                </label>
                <input
                  type="text"
                  placeholder={orgName}
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  className="w-full h-9 px-3 rounded border border-[var(--border)] text-sm bg-[var(--bg)] text-[var(--text)] outline-none focus:ring-2 focus:ring-danger/30 focus:border-danger/40"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  variant="danger"
                  disabled={!canConfirm || isPending}
                  loading={isPending}
                  onClick={() => cancel()}
                  className="w-full"
                >
                  Cancel my subscription
                </Button>
                <button onClick={handleClose} className="text-sm text-brand font-medium py-2 hover:underline">
                  Actually, keep my subscription
                </button>
              </div>
            </>
          )}

          {/* Step 3 — Post-cancellation */}
          {step === 3 && (
            <>
              <div className="flex flex-col items-center gap-4 py-4 text-center">
                <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center">
                  <CheckCircle2 size={28} className="text-[var(--text-muted)]" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
                    Subscription cancelled
                  </Dialog.Title>
                  <p className="text-sm text-[var(--text-muted)] max-w-[300px] mx-auto">
                    You are now on the Free plan. Thank you for using Querify.
                    Your data will remain available for 30 days.
                  </p>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  You have access until <strong>{periodLabel}</strong>.
                </p>
              </div>

              <div className="flex flex-col gap-2 mt-4">
                <Button
                  variant="secondary"
                  loading={reactivating}
                  onClick={() => reactivate()}
                  className="w-full"
                >
                  Reactivate subscription
                </Button>
                <button onClick={handleClose} className="text-sm text-[var(--text-muted)] py-2">
                  Close
                </button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const INVOICES_PER_PAGE = 10

export default function OrgBillingPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20"><Spinner /></div>}>
      <OrgBillingPageContent />
    </Suspense>
  )
}

function OrgBillingPageContent() {
  const qc = useQueryClient()
  useCheckoutSuccess()

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly")
  const [targetPlan, setTargetPlan] = useState<PlanKey | null>(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [invoicePage, setInvoicePage] = useState(1)

  const { data: sub, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["billing-subscription"],
    queryFn: () => billingApi.subscription() as Promise<SubscriptionInfo>,
    staleTime: 30_000,
  })

  const { data: usage } = useQuery<UsageSummary>({
    queryKey: ["billing-usage"],
    queryFn: () => billingApi.usage() as Promise<UsageSummary>,
    staleTime: 60_000,
  })

  const { data: pm } = useQuery<PaymentMethod>({
    queryKey: ["billing-payment-method"],
    queryFn: () => billingApi.paymentMethod() as Promise<PaymentMethod>,
    staleTime: 5 * 60_000,
    enabled: !!(sub?.plan_name && sub.plan_name !== "free"),
  })

  const { data: invoices, isLoading: invLoading } = useQuery<InvoiceItem[]>({
    queryKey: ["billing-invoices"],
    queryFn: () => billingApi.invoices() as Promise<InvoiceItem[]>,
    staleTime: 60_000,
  })

  const { data: org } = useQuery<TenantInfo>({
    queryKey: ["tenant"],
    queryFn: () => tenantApi.get() as Promise<TenantInfo>,
    staleTime: 5 * 60_000,
  })

  const { mutate: openPortal, isPending: portalPending } = useMutation({
    mutationFn: () => billingApi.portal(),
    onSuccess: (res) => { window.location.href = (res as { portal_url: string }).portal_url },
    onError: () => toast.error("Could not open billing portal."),
  })

  const planName = sub?.plan_name ?? "free"
  const planMeta = PLANS[planName as PlanKey]
  const isPaid = planName !== "free"
  const isCancelled = !!sub?.cancelled_at
  const periodEnd = sub?.current_period_end ?? null

  // Derived plan info
  const currentRank = PLAN_ORDER.indexOf(planName as PlanKey)

  // Invoice pagination
  const allInvoices = invoices ?? []
  const totalPages = Math.max(1, Math.ceil(allInvoices.length / INVOICES_PER_PAGE))
  const pageInvoices = allInvoices.slice((invoicePage - 1) * INVOICES_PER_PAGE, invoicePage * INVOICES_PER_PAGE)

  // Next invoice estimate from last invoice or preview
  const nextInvoiceAmount = (() => {
    if (!isPaid) return null
    const price = billingPeriod === "annual" ? planMeta?.annualMonthlyPrice : planMeta?.monthlyPrice
    return price ? price * 100 : null
  })()

  return (
    <div className="flex flex-col gap-6">
      {/* Reactivation banner */}
      {isCancelled && periodEnd && (
        <ReactivationBanner
          periodEnd={periodEnd}
          onReactivated={() => qc.invalidateQueries({ queryKey: ["billing-subscription"] })}
        />
      )}

      {/* Pending downgrade notice */}
      {sub?.pending_plan_change && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            Downgrade to <strong>{PLANS[sub.pending_plan_change as PlanKey]?.label}</strong> takes effect{" "}
            {fmtDate(sub.pending_change_date)}. You keep {planMeta?.label} until then.
          </p>
        </div>
      )}

      {/* ── Current plan card ────────────────────────────────────────────────── */}
      <div className={cn("rounded-xl border-2 bg-[var(--bg)] p-5", planMeta?.accentClass ?? "border-[var(--border)]")}>
        <SectionHeading>Current plan</SectionHeading>

        {subLoading ? (
          <Skeleton className="h-24" />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <PlanBadge plan={planName} />
                  {isCancelled && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                      <AlertTriangle size={10} /> Cancelling
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-[var(--text)]">
                  {planMeta?.monthlyPrice === 0 ? "Free" : `$${planMeta?.monthlyPrice}/mo`}
                </p>
                {periodEnd && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {isCancelled ? "Access until" : "Renews"} {fmtDate(periodEnd)}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {PLAN_ORDER.filter((p) => PLAN_ORDER.indexOf(p) > currentRank).map((p) => (
                  <Button key={p} size="sm" onClick={() => setTargetPlan(p)}>
                    <Zap size={12} /> Upgrade to {PLANS[p].label}
                  </Button>
                ))}
                {PLAN_ORDER.filter((p) => PLAN_ORDER.indexOf(p) < currentRank && p !== "free").map((p) => (
                  <Button key={p} size="sm" variant="secondary" onClick={() => setTargetPlan(p)}>
                    Downgrade to {PLANS[p].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Features */}
            {planMeta && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {planMeta.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <CheckCircle2 size={12} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            )}

            {/* Usage mini-meters */}
            {usage && (
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-[var(--border)]">
                {[
                  { label: "Queries", used: usage.queries_used, limit: usage.query_limit },
                  { label: "Connections", used: usage.connections_used, limit: usage.connection_limit },
                  { label: "Seats", used: usage.seats_used, limit: usage.seat_limit },
                ].map(({ label, used, limit }) => {
                  const p = limit ? Math.min(100, Math.round(used / limit * 100)) : 0
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mb-1">
                        <span>{label}</span>
                        <span className="tabular-nums">{limit === null ? `${used} / ∞` : `${used} / ${limit}`}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--surface-3)] overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", p >= 90 ? "bg-danger" : p >= 70 ? "bg-warning" : "bg-success")}
                          style={{ width: limit === null ? "0%" : `${p}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Payment method + Next invoice (2-col) ───────────────────────────── */}
      {isPaid && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Payment method */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <SectionHeading>Payment method</SectionHeading>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-8 rounded border border-[var(--border)] bg-[var(--surface-2)] flex items-center justify-center">
                  {pm?.brand ? (
                    <span className="text-[10px] font-bold text-[var(--text-muted)]">
                      {CARD_BRAND_ICONS[pm.brand.toLowerCase()] ?? pm.brand.toUpperCase()}
                    </span>
                  ) : (
                    <CreditCard size={14} className="text-[var(--text-muted)]" />
                  )}
                </div>
                <div>
                  {pm?.last4 ? (
                    <>
                      <p className="text-sm font-medium text-[var(--text)]">•••• •••• •••• {pm.last4}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Expires {pm.exp_month?.toString().padStart(2, "0")}/{pm.exp_year}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">Managed via Stripe</p>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4 w-full"
              loading={portalPending}
              onClick={() => openPortal()}
            >
              <ExternalLink size={12} /> Update payment method
            </Button>
            <p className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
              Card details managed securely by Stripe. Querify never stores card numbers.
            </p>
          </div>

          {/* Next invoice */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
            <SectionHeading>Next invoice</SectionHeading>
            {periodEnd ? (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-2xl font-bold text-[var(--text)] tabular-nums">
                    {nextInvoiceAmount ? fmt(nextInvoiceAmount) : "—"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Due {fmtDate(periodEnd)}
                  </p>
                </div>
                <div className="text-xs text-[var(--text-muted)] bg-[var(--surface-2)] rounded-lg p-3">
                  <p className="font-medium text-[var(--text)] mb-0.5">{planMeta?.label} plan</p>
                  <p>{sub?.billing_period === "annual" ? "Annual billing" : "Monthly billing"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No upcoming invoice.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Plan comparison grid ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
        <div className="flex items-center justify-between mb-5">
          <SectionHeading>Plans</SectionHeading>
          <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setBillingPeriod(p)}
                className={cn(
                  "px-3 py-1 rounded text-xs font-medium transition-colors capitalize",
                  billingPeriod === p
                    ? "bg-[var(--bg)] shadow-sm text-[var(--text)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-dim)]"
                )}
              >
                {p === "annual" ? "Annual −17%" : "Monthly"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {PLAN_ORDER.map((plan) => {
            const meta = PLANS[plan]
            const isCurrent = plan === planName
            const thisRank = PLAN_ORDER.indexOf(plan)
            const isUpgrade = thisRank > currentRank
            const price = billingPeriod === "annual" ? meta.annualMonthlyPrice : meta.monthlyPrice

            return (
              <div
                key={plan}
                className={cn(
                  "rounded-xl border p-4 flex flex-col gap-3 transition-shadow",
                  isCurrent ? `${meta.accentClass} shadow-md` : "border-[var(--border)]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--text)]">{meta.label}</span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] rounded px-1.5 py-0.5">
                      Current
                    </span>
                  )}
                </div>

                <div>
                  {price === 0
                    ? <span className="text-xl font-bold text-[var(--text)]">Free</span>
                    : <><span className="text-xl font-bold text-[var(--text)]">${price}</span><span className="text-xs text-[var(--text-muted)]">/mo</span></>}
                </div>

                <ul className="flex flex-col gap-1 flex-1">
                  {meta.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <CheckCircle2 size={10} className="text-success shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {!isCurrent && (
                  <Button
                    size="sm"
                    variant={isUpgrade ? "primary" : "secondary"}
                    onClick={() => setTargetPlan(plan)}
                    className="w-full text-xs"
                  >
                    {isUpgrade ? "Upgrade" : "Downgrade"}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Invoice history ──────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-5">
        <SectionHeading>Invoice history</SectionHeading>

        {invLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
          </div>
        ) : allInvoices.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-6">
            No invoices yet. Your first invoice will appear after payment.
          </p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="pb-2.5 text-left">Date</th>
                  <th className="pb-2.5 text-left">Description</th>
                  <th className="pb-2.5 text-right">Amount</th>
                  <th className="pb-2.5 text-right">Status</th>
                  <th className="pb-2.5 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pageInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[var(--surface-2)] transition-colors">
                    <td className="py-3 text-[var(--text-muted)] text-xs whitespace-nowrap">
                      {new Date(inv.created * 1000).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric",
                      })}
                    </td>
                    <td className="py-3 text-[var(--text-muted)] text-xs">
                      {planMeta?.label ?? "Querify"} subscription
                    </td>
                    <td className="py-3 text-right font-medium text-[var(--text)] tabular-nums">
                      {fmt(inv.amount_paid)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border capitalize",
                        inv.status === "paid"
                          ? "bg-success/10 text-success border-success/20"
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
                          className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
                        >
                          <Download size={11} /> PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <p className="text-xs text-[var(--text-muted)]">
                  {(invoicePage - 1) * INVOICES_PER_PAGE + 1}–{Math.min(invoicePage * INVOICES_PER_PAGE, allInvoices.length)} of {allInvoices.length}
                </p>
                <div className="flex gap-1">
                  <button onClick={() => setInvoicePage((p) => Math.max(1, p - 1))} disabled={invoicePage === 1}
                    className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-2)]">Previous</button>
                  <button onClick={() => setInvoicePage((p) => Math.min(totalPages, p + 1))} disabled={invoicePage === totalPages}
                    className="px-3 py-1 text-xs rounded border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--surface-2)]">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Danger zone ──────────────────────────────────────────────────────── */}
      {isPaid && !isCancelled && (
        <div className="flex justify-end pb-4">
          <button
            onClick={() => setCancelOpen(true)}
            className="text-xs text-[var(--text-muted)] hover:text-danger transition-colors underline underline-offset-2"
          >
            Cancel subscription
          </button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <PlanChangeModal
        targetPlan={targetPlan}
        billingPeriod={billingPeriod}
        currentPlan={planName}
        periodEnd={periodEnd}
        onClose={() => setTargetPlan(null)}
      />

      <OrgCancellationModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        planName={planMeta?.label ?? planName}
        periodEnd={periodEnd}
        orgName={org?.name ?? ""}
        onCancelled={() => qc.invalidateQueries({ queryKey: ["billing-subscription"] })}
      />
    </div>
  )
}
