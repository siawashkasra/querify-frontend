"use client"

import { use, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow, format } from "date-fns"
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  ArrowLeft, Clock, DollarSign,
  CheckCircle2, TrendingUp, ExternalLink,
  ChevronDown, ChevronUp, Mail, Ban, Loader2, Shield, Sparkles,
} from "lucide-react"
import Link from "next/link"
import { adminApi } from "@/lib/adminApi"
import type {
  TenantOverview, TenantMember, TenantConnection, TenantQuery,
  TenantBilling, AuditEvent,
} from "@/lib/adminApi"
import { cn } from "@/lib/cn"
import { PlanOverrideModal } from "@/components/admin/PlanOverrideModal"

// ── Types / helpers ───────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>
}

type TabId = "overview" | "members" | "connections" | "queries" | "billing" | "audit"

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "connections", label: "Connections" },
  { id: "queries", label: "Query History" },
  { id: "billing", label: "Billing" },
  { id: "audit", label: "Audit Log" },
]

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
      "inline-flex px-2 py-0.5 rounded text-xs font-medium border",
      PLAN_COLORS[plan.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200"
    )}>{plan}</span>
  )
}
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      "inline-flex px-2 py-0.5 rounded text-xs font-medium border",
      STATUS_COLORS[status.toLowerCase()] ?? "bg-gray-100 text-gray-500 border-gray-200"
    )}>{status}</span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-gray-100", className)} />
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return format(new Date(iso), "MMM d, yyyy")
}
function fmtDay(iso: string) {
  const d = new Date(iso)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}
// ── Main page ─────────────────────────────────────────────────────────────────

export default function TenantDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false)
  const [impersonateCode, setImpersonateCode] = useState<string | null>(null)
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false)
  const [suspendReason, setSuspendReason] = useState("")

  const overviewQuery = useQuery<TenantOverview>({
    queryKey: ["admin-tenant-overview", id],
    queryFn: () => adminApi.tenantOverview(id),
  })
  const tenant = overviewQuery.data

  const impersonateMutation = useMutation({
    mutationFn: () => adminApi.impersonateTenant(id),
    onSuccess: (data) => {
      setImpersonateCode(data.code)
      setImpersonateDialogOpen(true)
    },
  })

  const suspendMutation = useMutation({
    mutationFn: () => adminApi.suspendTenant(id, suspendReason),
    onSuccess: () => {
      setSuspendDialogOpen(false)
      setSuspendReason("")
      overviewQuery.refetch()
    },
  })

  function handleImpersonateClick() {
    // Log immediately before confirmation dialog opens
    impersonateMutation.mutate()
  }

  function handleConfirmImpersonate() {
    if (!impersonateCode || !tenant) return
    const url = `${window.location.origin}/?impersonate=${impersonateCode}`
    window.open(url, "_blank")
    setImpersonateDialogOpen(false)
    setImpersonateCode(null)
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto flex flex-col gap-6">
      {/* Back */}
      <Link
        href="/admin/tenants"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 w-fit transition-colors"
      >
        <ArrowLeft size={14} />
        All tenants
      </Link>

      {/* Header + actions */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Header info */}
        <div className="flex-1">
          {overviewQuery.isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-5 w-40" />
            </div>
          ) : tenant ? (
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
                <PlanBadge plan={tenant.plan_name} />
                <StatusBadge status={tenant.status} />
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {tenant.owner_email ?? "No owner"} · Created {fmtDate(tenant.created_at)}
              </p>
            </div>
          ) : null}
        </div>

        {/* Actions panel */}
        <div className="flex flex-col gap-2 min-w-[220px]">
          <button
            onClick={handleImpersonateClick}
            disabled={impersonateMutation.isPending}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {impersonateMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Shield size={14} />}
            Impersonate tenant
          </button>
          <button
            onClick={() => setSuspendDialogOpen(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Ban size={14} />
            Suspend tenant
          </button>
          {tenant?.owner_email && (
            <a
              href={`mailto:${tenant.owner_email}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Mail size={14} />
              Email owner
            </a>
          )}
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-violet-600 text-violet-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "overview" && <OverviewTab id={id} data={overviewQuery.data} loading={overviewQuery.isLoading} />}
        {activeTab === "members" && <MembersTab id={id} />}
        {activeTab === "connections" && <ConnectionsTab id={id} />}
        {activeTab === "queries" && <QueriesTab id={id} />}
        {activeTab === "billing" && <BillingTab id={id} tenantName={tenant?.name ?? id} />}
        {activeTab === "audit" && <AuditTab id={id} />}
      </div>

      {/* Impersonate dialog */}
      {impersonateDialogOpen && tenant && (
        <Modal onClose={() => setImpersonateDialogOpen(false)}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Shield size={18} className="text-red-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Confirm impersonation</h2>
            </div>
            <p className="text-sm text-gray-600">
              You are about to impersonate <strong>{tenant.name}</strong>. This action has already been logged.
              You will be opened in a new tab with admin impersonation mode active.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setImpersonateDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmImpersonate}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium"
              >
                <ExternalLink size={13} />
                Open impersonation session
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Suspend dialog */}
      {suspendDialogOpen && (
        <Modal onClose={() => setSuspendDialogOpen(false)}>
          <div className="flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-900">Suspend tenant</h2>
            <p className="text-sm text-gray-500">Provide a reason for the suspension. This will be logged.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSuspendDialogOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => suspendMutation.mutate()}
                disabled={!suspendReason.trim() || suspendMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium disabled:opacity-50"
              >
                {suspendMutation.isPending && <Loader2 size={13} className="animate-spin" />}
                Suspend
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
        {children}
      </div>
    </div>
  )
}

// ── Overview tab ──────────────────────────────────────────────────────────────

function OverviewTab({ data, loading }: { id?: string; data: TenantOverview | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    )
  }
  if (!data) return null

  const { kpis, volume_by_day, recent_activity } = data

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total queries" value={kpis.total_queries.toLocaleString()} icon={TrendingUp} />
        <KpiCard label="Success rate" value={`${kpis.success_rate.toFixed(1)}%`} icon={CheckCircle2} />
        <KpiCard label="Avg latency" value={`${kpis.avg_latency_ms.toFixed(0)} ms`} icon={Clock} />
        <KpiCard label="Total LLM cost" value={`$${kpis.total_cost_usd.toFixed(4)}`} icon={DollarSign} />
      </div>

      {/* Volume chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-sm font-semibold text-gray-700 mb-4">Query volume — last 30 days</p>
        {volume_by_day.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={volume_by_day} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}`, "Queries"]} labelFormatter={(l) => fmtDay(String(l))} contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="count" fill="#7c3aed" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Recent activity</p>
        </div>
        {recent_activity.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-400 text-center">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recent_activity.map((a) => (
              <li key={a.message_id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 truncate max-w-[400px]">{a.prompt}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <QueryStatusBadge status={a.status} />
                    {a.execution_ms != null && (
                      <span className="text-[11px] text-gray-400">{a.execution_ms} ms</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-3">
                  {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center">
          <Icon size={14} className="text-gray-400" />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}

// ── Members tab ───────────────────────────────────────────────────────────────

function MembersTab({ id }: { id: string }) {
  const { data, isLoading } = useQuery<TenantMember[]>({
    queryKey: ["admin-tenant-members", id],
    queryFn: () => adminApi.tenantMembers(id),
  })

  if (isLoading) return <Skeleton className="h-48" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Email", "Name", "Role", "Status", "Last Active"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(data ?? []).length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No members.</td></tr>
          ) : (data ?? []).map((m) => (
            <tr key={m.user_id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-gray-700">{m.email}</td>
              <td className="px-4 py-3 text-gray-500">{m.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-600">{m.role}</span>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded text-[11px] font-medium",
                  m.membership_status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-500"
                )}>{m.membership_status}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {m.last_login_at
                  ? formatDistanceToNow(new Date(m.last_login_at), { addSuffix: true })
                  : "Never"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Connections tab ───────────────────────────────────────────────────────────

function ConnectionsTab({ id }: { id: string }) {
  const { data, isLoading } = useQuery<TenantConnection[]>({
    queryKey: ["admin-tenant-connections", id],
    queryFn: () => adminApi.tenantConnections(id),
  })

  if (isLoading) return <Skeleton className="h-48" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Name", "Type", "Status", "Last Tested", "Tables", "Created"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(data ?? []).length === 0 ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No connections.</td></tr>
          ) : (data ?? []).map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">{c.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-600 border border-blue-100">{c.db_type}</span>
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex px-2 py-0.5 rounded text-[11px] font-medium border",
                  c.status === "active" ? "bg-green-50 text-green-700 border-green-200"
                    : c.status === "error" ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-gray-50 text-gray-500 border-gray-200"
                )}>{c.status}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400">
                {c.last_tested_at
                  ? formatDistanceToNow(new Date(c.last_tested_at), { addSuffix: true })
                  : "Never"}
              </td>
              <td className="px-4 py-3 text-gray-600 tabular-nums">{c.table_count ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-gray-400">{fmtDate(c.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Query History tab ─────────────────────────────────────────────────────────

function QueryStatusBadge({ status }: { status: string }) {
  const COLOR: Record<string, string> = {
    success: "bg-green-50 text-green-700 border-green-200",
    failed: "bg-red-50 text-red-600 border-red-200",
    timeout: "bg-amber-50 text-amber-700 border-amber-200",
    unsafe: "bg-orange-50 text-orange-700 border-orange-200",
  }
  return (
    <span className={cn(
      "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border",
      COLOR[status.toLowerCase()] ?? "bg-gray-50 text-gray-500 border-gray-200"
    )}>{status}</span>
  )
}

function QueriesTab({ id }: { id: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery<TenantQuery[]>({
    queryKey: ["admin-tenant-queries", id],
    queryFn: () => adminApi.tenantQueries(id),
  })

  if (isLoading) return <Skeleton className="h-48" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Prompt", "Status", "Latency", "Cost", "Time"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 ? (
            <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No queries yet.</td></tr>
          ) : (data ?? []).map((q) => (
            <>
              <tr
                key={q.id}
                className="hover:bg-gray-50 cursor-pointer border-t border-gray-50 transition-colors"
                onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
              >
                <td className="px-4 py-3 max-w-[300px]">
                  <p className="truncate text-gray-700">{q.prompt}</p>
                </td>
                <td className="px-4 py-3"><QueryStatusBadge status={q.status} /></td>
                <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                  {q.execution_ms != null ? `${q.execution_ms} ms` : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 tabular-nums text-xs">
                  {q.llm_cost_usd != null ? `$${q.llm_cost_usd.toFixed(5)}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    {formatDistanceToNow(new Date(q.created_at), { addSuffix: true })}
                    {expandedId === q.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                </td>
              </tr>
              {expandedId === q.id && (
                <tr key={`${q.id}-expanded`} className="bg-gray-50 border-t border-gray-100">
                  <td colSpan={5} className="px-4 py-4">
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Full prompt</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{q.prompt_full}</p>
                      </div>
                      {q.sql && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Generated SQL</p>
                          <pre className="text-xs bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto">{q.sql}</pre>
                        </div>
                      )}
                      {q.error_message && (
                        <div>
                          <p className="text-xs font-semibold text-red-500 uppercase mb-1">Error — {q.error_type}</p>
                          <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{q.error_message}</p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Billing tab ───────────────────────────────────────────────────────────────

function BillingTab({ id, tenantName }: { id: string; tenantName: string }) {
  const qc = useQueryClient()
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [removingOverride, setRemovingOverride] = useState(false)

  const { data, isLoading } = useQuery<TenantBilling>({
    queryKey: ["admin-tenant-billing", id],
    queryFn: () => adminApi.tenantBilling(id),
  })

  const handleRemoveOverride = async () => {
    if (!confirm(`Downgrade ${tenantName} to Free immediately?`)) return
    setRemovingOverride(true)
    try {
      await adminApi.setTenantPlan(id, {
        plan_name: "free",
        reason: "Override removed by admin",
        duration_days: null,
      })
      qc.invalidateQueries({ queryKey: ["admin-tenant-billing", id] })
      qc.invalidateQueries({ queryKey: ["admin-tenants"] })
    } catch {
      alert("Failed to remove override")
    } finally {
      setRemovingOverride(false)
    }
  }

  if (isLoading) return <Skeleton className="h-48" />
  if (!data) return null

  return (
    <div className="flex flex-col gap-4">
      {/* Override banner */}
      {data.is_manual_override && (
        <div className="flex items-start gap-3 bg-amber-50 rounded-xl border border-amber-200 px-5 py-4">
          <Sparkles size={16} className="shrink-0 text-amber-500 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">⚠ Manual override active</p>
            <div className="mt-1.5 grid grid-cols-2 gap-x-6 gap-y-1">
              <p className="text-xs text-amber-700"><span className="font-medium">Plan:</span> {data.plan_name}</p>
              <p className="text-xs text-amber-700"><span className="font-medium">Set by:</span> {data.override_by ?? "—"}</p>
              {data.override_at && (
                <p className="text-xs text-amber-700"><span className="font-medium">On:</span> {fmtDate(data.override_at)}</p>
              )}
              <p className="text-xs text-amber-700">
                <span className="font-medium">Expires:</span>{" "}
                {data.override_expires_at ? fmtDate(data.override_expires_at) : "Never"}
              </p>
              {data.override_reason && (
                <p className="text-xs text-amber-700 col-span-2">
                  <span className="font-medium">Reason:</span> {data.override_reason}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleRemoveOverride}
            disabled={removingOverride}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-amber-200 text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {removingOverride && <Loader2 size={11} className="animate-spin" />}
            Remove override
          </button>
        </div>
      )}

      {/* Main billing grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-700">Subscription</p>
          <button
            onClick={() => setShowOverrideModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 transition-colors"
          >
            <Sparkles size={11} />
            Set plan
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Plan</p>
            <p className="text-sm font-medium text-gray-800">{data.plan_name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Subscription status</p>
            <p className="text-sm font-medium text-gray-800">{data.status}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Billing period</p>
            <p className="text-sm font-medium text-gray-800">{data.billing_period ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Period</p>
            <p className="text-sm font-medium text-gray-800">
              {data.current_period_start ? fmtDate(data.current_period_start) : "—"} →{" "}
              {data.current_period_end ? fmtDate(data.current_period_end) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Queries used (period)</p>
            <p className="text-sm font-medium text-gray-800 tabular-nums">{data.queries_used_this_period.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Stripe subscription</p>
            <p className="text-sm text-gray-600 truncate">{data.stripe_subscription_id ?? "—"}</p>
          </div>
        </div>
      </div>

      {data.cancelled_at && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <p className="text-sm font-medium text-red-700">Cancelled {fmtDate(data.cancelled_at)}</p>
          {data.cancel_reason && <p className="text-sm text-red-600 mt-0.5">{data.cancel_reason}</p>}
        </div>
      )}

      {showOverrideModal && (
        <PlanOverrideModal
          tenantId={id}
          tenantName={tenantName}
          currentPlan={data.plan_name}
          onClose={() => setShowOverrideModal(false)}
        />
      )}
    </div>
  )
}

// ── Audit Log tab ─────────────────────────────────────────────────────────────

function AuditTab({ id }: { id: string }) {
  const { data, isLoading } = useQuery<AuditEvent[]>({
    queryKey: ["admin-tenant-audit", id],
    queryFn: () => adminApi.tenantAudit(id),
  })

  if (isLoading) return <Skeleton className="h-48" />

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {["Event", "Time", "Details"].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {(data ?? []).length === 0 ? (
            <tr><td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-400">No audit events.</td></tr>
          ) : (data ?? []).map((e) => (
            <tr key={e.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-gray-100 text-gray-700">{e.event_type}</span>
              </td>
              <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                {format(new Date(e.created_at), "MMM d, yyyy HH:mm:ss")}
              </td>
              <td className="px-4 py-3 text-xs text-gray-500 max-w-[400px]">
                {e.metadata ? (
                  <pre className="truncate font-mono text-[11px]">{JSON.stringify(e.metadata)}</pre>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
