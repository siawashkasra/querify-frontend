"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format, formatDistanceToNow } from "date-fns"
import {
  FileText, Loader2, Clock, Mail, AlertCircle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { BillingRow } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

const BILLING_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  past_due: "bg-red-50 text-red-600 border-red-200",
  cancelled: "bg-gray-50 text-gray-500 border-gray-200",
  trialing: "bg-blue-50 text-blue-600 border-blue-200",
  unpaid: "bg-red-50 text-red-700 border-red-300",
  paused: "bg-amber-50 text-amber-700 border-amber-200",
}

const PLAN_COLOR: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 border-gray-200",
  starter: "bg-blue-50 text-blue-600 border-blue-200",
  pro: "bg-violet-50 text-violet-700 border-violet-200",
  team: "bg-amber-50 text-amber-700 border-amber-200",
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtCents(cents: number) {
  if (cents === 0) return "—"
  if (cents >= 100_000) return `$${(cents / 100_000).toFixed(1)}k`
  return `$${(cents / 100).toFixed(2)}`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TenantBillingPage() {
  const qc = useQueryClient()
  const [planFilter, setPlanFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [actionFeedback, setActionFeedback] = useState<Record<string, string>>({})

  const params = new URLSearchParams()
  if (planFilter) params.set("plan", planFilter)
  if (statusFilter) params.set("billing_status", statusFilter)
  params.set("page", String(page))
  params.set("page_size", "25")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-billing-list", planFilter, statusFilter, page],
    queryFn: () => adminApi.billingList(params),
    staleTime: 2 * 60_000,
    placeholderData: (prev) => prev,
  })

  const graceMutation = useMutation({
    mutationFn: (tenantId: string) => adminApi.extendGracePeriod(tenantId),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [id]: "Grace extended" }))
      qc.invalidateQueries({ queryKey: ["admin-billing-list"] })
    },
  })

  const notifyMutation = useMutation({
    mutationFn: (tenantId: string) => adminApi.notifyBillingTenant(tenantId),
    onSuccess: (_, id) => {
      setActionFeedback((f) => ({ ...f, [`notify-${id}`]: "Email sent" }))
    },
  })

  const rows: BillingRow[] = data?.rows ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 25))
  const failedCount = rows.filter((r) => r.failed_payment).length

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tenant Billing</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} tenants` : isLoading ? "Loading…" : "No billing data"}
              {failedCount > 0 && (
                <span className="ml-2 text-red-600 font-medium flex-inline items-center gap-1">
                  · {failedCount} failed payment{failedCount > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
        </div>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Failed payments banner */}
      {failedCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">
              {failedCount} tenant{failedCount > 1 ? "s have" : " has"} a failed payment
            </p>
            <p className="text-xs text-red-600 mt-0.5">Rows highlighted in red below. Use "Extend grace" or "Notify" to take action.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={planFilter}
          onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All billing statuses</option>
          <option value="active">Active</option>
          <option value="past_due">Past due</option>
          <option value="cancelled">Cancelled</option>
          <option value="trialing">Trialing</option>
          <option value="unpaid">Unpaid</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Tenant", "Plan", "Billing status", "Next invoice", "Lifetime value", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No billing data found.</td>
                </tr>
              ) : rows.map((row) => {
                const graceFeedback = actionFeedback[row.tenant_id]
                const notifyFeedback = actionFeedback[`notify-${row.tenant_id}`]
                const anyFeedback = graceFeedback || notifyFeedback

                return (
                  <tr
                    key={row.tenant_id}
                    className={cn(
                      "hover:bg-gray-50 transition-colors",
                      row.failed_payment && "bg-red-50/40"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.failed_payment && (
                          <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-medium text-gray-800">{row.tenant_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        PLAN_COLOR[row.plan_name.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200"
                      )}>{row.plan_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
                        BILLING_STATUS_COLOR[row.billing_status] ?? "bg-gray-50 text-gray-500 border-gray-200"
                      )}>{row.billing_status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {row.next_invoice_at ? (
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="text-gray-400" />
                          {format(new Date(row.next_invoice_at), "MMM d, yyyy")}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700 tabular-nums text-xs font-medium">
                      {fmtCents(row.lifetime_value_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {anyFeedback ? (
                        <span className="text-xs text-green-600 font-medium">{graceFeedback ?? notifyFeedback}</span>
                      ) : row.failed_payment ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => graceMutation.mutate(row.tenant_id)}
                            disabled={graceMutation.isPending && graceMutation.variables === row.tenant_id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                          >
                            {graceMutation.isPending && graceMutation.variables === row.tenant_id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <Clock size={10} />}
                            Extend grace
                          </button>
                          <button
                            onClick={() => notifyMutation.mutate(row.tenant_id)}
                            disabled={notifyMutation.isPending && notifyMutation.variables === row.tenant_id}
                            className="flex items-center gap-1 px-2 py-1 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                          >
                            {notifyMutation.isPending && notifyMutation.variables === row.tenant_id
                              ? <Loader2 size={10} className="animate-spin" />
                              : <Mail size={10} />}
                            Notify
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 25 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span className="px-3 py-1 text-xs text-gray-500">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
