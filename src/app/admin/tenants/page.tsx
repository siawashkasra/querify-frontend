"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  Search, Download, ChevronUp, ChevronDown, ChevronsUpDown,
  Users, Loader2, Sparkles,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { TenantRow } from "@/lib/adminApi"
import { cn } from "@/lib/cn"
import { PlanOverrideModal } from "@/components/admin/PlanOverrideModal"

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-600 border-gray-200",
  starter: "bg-blue-50 text-blue-600 border-blue-200",
  pro: "bg-violet-50 text-violet-700 border-violet-200",
  team: "bg-amber-50 text-amber-700 border-amber-200",
}
const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
}

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
      PLAN_COLORS[plan.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200"
    )}>
      {plan}
    </span>
  )
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border",
      STATUS_COLORS[status.toLowerCase()] ?? "bg-gray-100 text-gray-500 border-gray-200"
    )}>
      {status}
    </span>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "MMM d, yyyy")
}
function fmtMrr(cents: number) {
  if (cents === 0) return "—"
  return `$${(cents / 100).toFixed(2)}`
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

type SortCol = "name" | "plan_name" | "status" | "created_at" | "queries_this_month" | "last_active_at" | "mrr_cents"
type SortDir = "asc" | "desc"

const COLS: { key: SortCol; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "plan_name", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "created_at", label: "Created" },
  { key: "queries_this_month", label: "Queries (mo)" },
  { key: "last_active_at", label: "Last Active" },
  { key: "mrr_cents", label: "MRR" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [plan, setPlan] = useState("")
  const [status, setStatus] = useState("")
  const [sortCol, setSortCol] = useState<SortCol>("created_at")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [page, setPage] = useState(1)
  const [overrideTarget, setOverrideTarget] = useState<TenantRow | null>(null)

  const debouncedSearch = useDebounce(search, 300)

  // Reset page when filters change (handled in onChange callbacks — not in effects)
  function setFilter<T>(setter: (v: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  const params = new URLSearchParams()
  if (debouncedSearch) params.set("search", debouncedSearch)
  if (plan) params.set("plan", plan)
  if (status) params.set("status", status)
  params.set("sort", sortCol)
  params.set("order", sortDir)
  params.set("page", String(page))
  params.set("page_size", "25")

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-tenants", debouncedSearch, plan, status, sortCol, sortDir, page],
    queryFn: () => adminApi.tenants(params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  const tenants = data?.tenants ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 25))

  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
    setPage(1)
  }

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronsUpDown size={12} className="opacity-30" />
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-violet-600" />
      : <ChevronDown size={12} className="text-violet-600" />
  }

  function handleExport() {
    const exportParams = new URLSearchParams(params)
    exportParams.delete("page")
    exportParams.delete("page_size")
    const token = (() => { try { return (require("@/store/authStore").useAuthStore).getState().accessToken ?? null } catch { return null } })()
    const url = `${adminApi.exportTenantsUrl()}?${exportParams}${token ? `&token=${token}` : ""}`
    window.open(url, "_blank")
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={18} className="text-gray-400" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tenants</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {total > 0 ? `${total.toLocaleString()} total` : "Loading…"}
            </p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={13} />
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
          />
        </div>
        <select
          value={plan}
          onChange={(e) => setFilter(setPlan, e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All plans</option>
          <option value="free">Free</option>
          <option value="starter">Starter</option>
          <option value="pro">Pro</option>
          <option value="team">Team</option>
        </select>
        <select
          value={status}
          onChange={(e) => setFilter(setStatus, e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
        </select>
        {isFetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                {COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700"
                    onClick={() => handleSort(key)}
                  >
                    <span className="flex items-center gap-1.5">
                      {label}
                      <SortIcon col={key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-sm text-gray-400">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant, i) => (
                  <TenantRow
                    key={tenant.id}
                    index={(page - 1) * 25 + i + 1}
                    tenant={tenant}
                    onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                    onSetPlan={(e) => { e.stopPropagation(); setOverrideTarget(tenant) }}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              Showing {((page - 1) * 25) + 1}–{Math.min(page * 25, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-xs text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {overrideTarget && (
        <PlanOverrideModal
          tenantId={overrideTarget.id}
          tenantName={overrideTarget.name}
          currentPlan={overrideTarget.plan_name}
          onClose={() => setOverrideTarget(null)}
        />
      )}
    </div>
  )
}

function TenantRow({
  index, tenant, onClick, onSetPlan,
}: { index: number; tenant: TenantRow; onClick: () => void; onSetPlan: (e: React.MouseEvent) => void }) {
  return (
    <tr
      className="hover:bg-violet-50/40 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{index}</td>
      <td className="px-4 py-3 font-medium text-gray-900">{tenant.name}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PlanBadge plan={tenant.plan_name} />
          {tenant.is_manual_override && (
            <span
              title={`Override by ${tenant.override_by ?? "admin"}${tenant.override_reason ? ` — ${tenant.override_reason}` : ""}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
            >
              <Sparkles size={9} />
              Override
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3"><StatusBadge status={tenant.status} /></td>
      <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(tenant.created_at)}</td>
      <td className="px-4 py-3 text-gray-700 tabular-nums">{tenant.queries_this_month.toLocaleString()}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">
        {tenant.last_active_at
          ? formatDistanceToNow(new Date(tenant.last_active_at), { addSuffix: true })
          : "—"}
      </td>
      <td className="px-4 py-3 text-gray-700 tabular-nums text-xs">{fmtMrr(tenant.mrr_cents)}</td>
      <td className="px-4 py-3 text-gray-400 text-xs">{tenant.owner_email ?? "—"}</td>
      <td className="px-4 py-3">
        <button
          onClick={onSetPlan}
          className="px-2.5 py-1 rounded text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors whitespace-nowrap"
        >
          Set plan
        </button>
      </td>
    </tr>
  )
}
