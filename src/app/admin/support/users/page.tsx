"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"
import {
  Search, User, Mail, Key, ExternalLink,
  Loader2, CheckCircle2, AlertCircle,
} from "lucide-react"
import { adminApi } from "@/lib/adminApi"
import type { UserSearchResult } from "@/lib/adminApi"
import { cn } from "@/lib/cn"

// ── Helpers ───────────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return d
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
  unverified: "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
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

// ── User result card ──────────────────────────────────────────────────────────

function UserCard({ user }: { user: UserSearchResult }) {
  const [resetFeedback, setResetFeedback] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [emailFeedback, setEmailFeedback] = useState<"idle" | "sending" | "sent" | "error">("idle")

  const resetMutation = useMutation({
    mutationFn: () => adminApi.sendPasswordReset(user.user_id),
    onMutate: () => setResetFeedback("sending"),
    onSuccess: () => setResetFeedback("sent"),
    onError: () => setResetFeedback("error"),
  })

  const emailMutation = useMutation({
    mutationFn: () => adminApi.sendUserEmail(user.user_id, "Message from Querify support", ""),
    onMutate: () => setEmailFeedback("sending"),
    onSuccess: () => setEmailFeedback("sent"),
    onError: () => setEmailFeedback("error"),
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{user.name ?? "(no name)"}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={cn(
            "inline-flex px-2 py-0.5 rounded text-[11px] font-medium border",
            STATUS_COLOR[user.account_status] ?? "bg-gray-50 text-gray-500 border-gray-200"
          )}>{user.account_status}</span>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Role</p>
          <p className="text-sm text-gray-700 capitalize">{user.role}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Tenant</p>
          {user.tenant_id ? (
            <Link
              href={`/admin/tenants/${user.tenant_id}`}
              className="text-sm text-violet-600 hover:text-violet-800 flex items-center gap-1"
            >
              {user.tenant_name ?? "—"}
              <ExternalLink size={11} />
            </Link>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Plan</p>
          {user.plan_name ? (
            <span className={cn(
              "inline-flex px-1.5 py-0.5 rounded text-[11px] font-medium border",
              PLAN_COLOR[user.plan_name.toLowerCase()] ?? "bg-gray-100 text-gray-600 border-gray-200"
            )}>{user.plan_name}</span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Last login</p>
          <p className="text-sm text-gray-600">
            {user.last_login_at
              ? formatDistanceToNow(new Date(user.last_login_at), { addSuffix: true })
              : "Never"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">Queries this month</p>
          <p className="text-sm text-gray-700 tabular-nums font-medium">{user.queries_this_month.toLocaleString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
        {/* Reset password */}
        <button
          onClick={() => resetMutation.mutate()}
          disabled={resetFeedback !== "idle"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            resetFeedback === "sent"
              ? "border-green-200 bg-green-50 text-green-700"
              : resetFeedback === "error"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-gray-200 text-gray-600 hover:bg-gray-50"
          )}
        >
          {resetFeedback === "sending" ? (
            <Loader2 size={11} className="animate-spin" />
          ) : resetFeedback === "sent" ? (
            <CheckCircle2 size={11} />
          ) : resetFeedback === "error" ? (
            <AlertCircle size={11} />
          ) : (
            <Key size={11} />
          )}
          {resetFeedback === "sent" ? "Reset sent" : resetFeedback === "error" ? "Failed" : "Send password reset"}
        </button>

        {/* Send email */}
        <a
          href={`mailto:${user.email}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Mail size={11} />
          Send email
        </a>

        {user.tenant_id && (
          <Link
            href={`/admin/tenants/${user.tenant_id}`}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-violet-200 text-violet-700 hover:bg-violet-50 transition-colors"
          >
            <ExternalLink size={11} />
            Tenant detail
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserLookupPage() {
  const [query, setQuery] = useState("")
  const debouncedQuery = useDebounce(query, 300)

  const { data, isLoading, isFetching } = useQuery<UserSearchResult[]>({
    queryKey: ["admin-user-search", debouncedQuery],
    queryFn: () => adminApi.userSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  })

  const results = data ?? []
  const hasSearched = debouncedQuery.length >= 2

  return (
    <div className="p-6 max-w-[900px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Search size={18} className="text-gray-400" />
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Lookup</h1>
          <p className="text-sm text-gray-400 mt-0.5">Search by email address or display name</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          autoFocus
          placeholder="Search by email or name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-3 text-sm border border-gray-200 rounded-xl bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
        />
        {isFetching && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {/* Results */}
      {isLoading && hasSearched ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <User size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No users found for "{debouncedQuery}"</p>
        </div>
      ) : results.length > 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-400">{results.length} result{results.length !== 1 ? "s" : ""}</p>
          {results.map((u) => <UserCard key={u.user_id} user={u} />)}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Search size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Enter at least 2 characters to search</p>
        </div>
      )}
    </div>
  )
}
