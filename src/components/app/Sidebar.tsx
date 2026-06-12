"use client"

import { useRef, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  LayoutDashboard, Settings, ChevronLeft, ChevronRight, Sparkles, FileText, Database,
  ChevronDown, Check, Loader2, Building2, LogOut, Plus, Search, X,
  Trash2, MoreHorizontal,
} from "lucide-react"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useAppStore } from "@/store/appStore"
import { useChatStore } from "@/store/chatStore"
import { useAuthStore } from "@/store/authStore"
import { connections, insights as insightsApi, me as meApi, query as queryApi } from "@/lib/api"
import { INSIGHTS_ENABLED } from "@/lib/featureFlags"
import { usePermissions } from "@/lib/permissions"
import { useAuth } from "@/hooks/useAuth"
import type { Connection, Insight, ChatSession } from "@/types"
import type { UserProfile, UserTenant } from "@/lib/api"
import { NotificationPanel } from "@/components/app/NotificationPanel"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

// ── Date grouping ─────────────────────────────────────────────────────────────

type DateGroup = "Today" | "Yesterday" | "Last 7 days" | "Last 30 days" | "Older"
const GROUP_ORDER: DateGroup[] = ["Today", "Yesterday", "Last 7 days", "Last 30 days", "Older"]

function getDateGroup(dateStr: string, now: Date): DateGroup {
  const d = new Date(dateStr)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86_400_000)
  const sevenAgo = new Date(today.getTime() - 7 * 86_400_000)
  const thirtyAgo = new Date(today.getTime() - 30 * 86_400_000)
  if (d >= today) return "Today"
  if (d >= yesterday) return "Yesterday"
  if (d >= sevenAgo) return "Last 7 days"
  if (d >= thirtyAgo) return "Last 30 days"
  return "Older"
}

function groupSessions(sessions: ChatSession[]): [DateGroup, ChatSession[]][] {
  const now = new Date()
  const map: Record<DateGroup, ChatSession[]> = {
    Today: [], Yesterday: [], "Last 7 days": [], "Last 30 days": [], Older: [],
  }
  for (const s of sessions) map[getDateGroup(s.last_active_at, now)].push(s)
  return GROUP_ORDER.map((g) => [g, map[g]] as [DateGroup, ChatSession[]]).filter(([, arr]) => arr.length > 0)
}

// ── Tenant Selector ───────────────────────────────────────────────────────────

function TenantSelector({ collapsed }: { collapsed: boolean }) {
  const { push: routerPush } = useRouter()
  const { establishSession } = useAuth()
  const tenantId = useAuthStore((s) => s.tenantId)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const { data: userTenants } = useQuery<UserTenant[]>({
    queryKey: ["me-tenants"],
    queryFn: () => meApi.tenants() as Promise<UserTenant[]>,
    staleTime: 5 * 60_000,
  })

  const currentTenant = userTenants?.find((t) => t.tenant_id === tenantId)
  const hasMultiple = (userTenants?.length ?? 0) > 1

  async function handleSwitch(targetId: string) {
    if (targetId === tenantId || switching) return
    setSwitching(targetId)
    try {
      const tokens = await meApi.switchTenant(targetId)
      await establishSession(tokens as { access_token: string; refresh_token: string; expires_in: number })
      routerPush("/dashboard")
    } catch {
      setSwitching(null)
    }
  }

  if (collapsed) {
    return (
      <div className="flex items-center justify-center py-2">
        <span title={currentTenant?.tenant_name ?? "Tenant"}>
          <Building2 size={16} className="text-[var(--text-muted)]" />
        </span>
      </div>
    )
  }

  return (
    <div ref={ref} className="relative px-3 py-2">
      <button
        onClick={() => hasMultiple && setOpen((o) => !o)}
        className={cn("flex items-center gap-2 w-full text-left rounded", hasMultiple ? "hover:bg-[var(--surface-2)] cursor-pointer" : "cursor-default")}
      >
        <Building2 size={13} className="text-[var(--text-muted)] shrink-0" />
        <span className="flex-1 text-xs font-medium text-[var(--text-dim)] truncate">
          {currentTenant?.tenant_name ?? "Loading…"}
        </span>
        {hasMultiple && <ChevronDown size={12} className={cn("text-[var(--text-muted)] shrink-0 transition-transform", open && "rotate-180")} />}
      </button>
      {open && hasMultiple && (
        <div className="absolute left-2 right-2 top-full mt-1 z-50 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
          {userTenants!.map((t) => {
            const isActive = t.tenant_id === tenantId
            const isLoading = switching === t.tenant_id
            return (
              <button
                key={t.tenant_id}
                onClick={() => handleSwitch(t.tenant_id)}
                disabled={isActive || !!switching}
                className={cn("flex items-center gap-2 w-full px-3 py-2 text-left text-xs transition-colors disabled:cursor-default", isActive ? "bg-[var(--surface-2)] text-brand font-medium" : "text-[var(--text-dim)] hover:bg-[var(--surface-2)]")}
              >
                {isLoading ? <Loader2 size={11} className="animate-spin shrink-0" /> : isActive ? <Check size={11} className="shrink-0 text-brand" /> : <span className="w-[11px] shrink-0" />}
                <span className="flex-1 truncate">{t.tenant_name}</span>
                <span className="text-[10px] text-[var(--text-muted)] capitalize shrink-0">{t.role.replace("_", " ")}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Nav items ─────────────────────────────────────────────────────────────────

interface NavItem { label: string; icon: React.ElementType; href: string; permission?: string; enabled?: boolean }

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Connections", icon: Database, href: "/connections" },
  // Insights folded into the dashboard for now — restored by NEXT_PUBLIC_INSIGHTS_ENABLED=true.
  { label: "Insights", icon: Sparkles, href: "/insights", enabled: INSIGHTS_ENABLED },
  { label: "Activity", icon: FileText, href: "/audit-log", permission: "audit_log:view" },
  { label: "Settings", icon: Settings, href: "/settings", permission: "settings:view" },
]

// ── User footer ───────────────────────────────────────────────────────────────

function UserFooter({ collapsed }: { collapsed: boolean }) {
  const { logout } = useAuth()
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["me-profile"],
    queryFn: () => meApi.profile() as Promise<UserProfile>,
    staleTime: 5 * 60_000,
  })
  const initials = (profile?.name ?? profile?.email ?? "?").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)

  if (collapsed) {
    return (
      <button onClick={logout} title="Sign out" className="flex items-center justify-center w-full py-2 text-[var(--text-muted)] hover:text-danger transition-colors">
        <LogOut size={15} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded hover:bg-[var(--surface-2)] group transition-colors">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand text-[11px] font-bold select-none">{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[var(--text)] truncate leading-tight">{profile?.name ?? "Account"}</p>
        <p className="text-[10px] text-[var(--text-muted)] truncate leading-tight">{profile?.email ?? ""}</p>
      </div>
      <button onClick={logout} title="Sign out" className="shrink-0 p-1 rounded text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-danger transition-all" aria-label="Sign out">
        <LogOut size={14} />
      </button>
    </div>
  )
}

// ── Session item ──────────────────────────────────────────────────────────────

function SessionItem({ session, isActive, onDelete }: { session: ChatSession; isActive: boolean; onDelete: (id: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // FIX 4b — live auto-title from the session_title SSE event, no refetch.
  const liveTitle = useChatStore((s) => s.sessionTitles[session.id])
  const title = liveTitle ?? session.title ?? "New chat"

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setMenuOpen(false)
    onDelete(session.id)
  }, [session.id, onDelete])

  return (
    <div className="relative group">
      <Link
        href={`/chat/${session.id}`}
        className={cn(
          "flex items-center gap-2 pl-2.5 pr-8 py-1.5 rounded text-[13px] transition-colors border-l-2",
          isActive
            ? "bg-[var(--brand-light)] border-brand text-brand font-medium"
            : "border-transparent text-[var(--text-dim)] hover:bg-white hover:text-[var(--text)]"
        )}
      >
        <span className="truncate flex-1 leading-tight">{title.slice(0, 50)}</span>
      </Link>
      <div ref={menuRef} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); setMenuOpen((o) => !o) }}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-3)] transition-colors"
        >
          <MoreHorizontal size={12} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full mt-0.5 z-50 rounded-lg border border-[var(--border)] bg-white shadow-lg overflow-hidden w-28">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors"
            >
              <Trash2 size={11} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Session history section ───────────────────────────────────────────────────

function SessionHistory({ activeSessionId }: { activeSessionId: string | undefined }) {
  const qc = useQueryClient()
  const router = useRouter()
  const { activeConnectionId } = useAppStore()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [collapsed, setCollapsed] = useState<Set<DateGroup>>(new Set())
  const [showMore, setShowMore] = useState<Set<DateGroup>>(new Set())
  const searchRef = useRef<HTMLInputElement>(null)

  const { data: sessions } = useQuery<ChatSession[]>({
    queryKey: ["sessions", activeConnectionId],
    queryFn: () => queryApi.sessions(activeConnectionId ?? undefined) as Promise<ChatSession[]>,
    staleTime: 30_000,
  })

  const handleDelete = useCallback(async (id: string) => {
    try {
      await queryApi.deleteSession(id)
      qc.invalidateQueries({ queryKey: ["sessions"] })
      // If the deleted session is the one currently open, leave it — otherwise
      // the page keeps streaming to a session that no longer exists (404).
      if (id === activeSessionId) router.push("/chat/new")
    } catch { /* silent */ }
  }, [qc, activeSessionId, router])

  // Sort newest-first before grouping so new chats appear at the top of their group
  const sorted = [...(sessions ?? [])].sort(
    (a, b) => new Date(b.last_active_at).getTime() - new Date(a.last_active_at).getTime()
  )

  const filtered = sorted.filter((s) =>
    !searchQuery || (s.title || "New chat").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = groupSessions(filtered)

  const toggleGroup = (group: DateGroup) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const toggleShowMore = (group: DateGroup) => {
    setShowMore((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-0 flex-1 overflow-y-auto">
      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-[var(--bg)] z-10">
        {searchOpen ? (
          <div className="flex items-center gap-1 flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1">
            <Search size={11} className="text-[var(--text-muted)] shrink-0" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setSearchOpen(false); setSearchQuery("") } }}
              placeholder="Search chats…"
              className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
              autoFocus
            />
            <button onClick={() => { setSearchOpen(false); setSearchQuery("") }} className="text-[var(--text-muted)] hover:text-[var(--text-dim)]">
              <X size={11} />
            </button>
          </div>
        ) : (
          <>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Recent</span>
            <button
              onClick={() => { setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50) }}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-dim)] hover:bg-[var(--surface-2)] transition-colors"
              title="Search chats"
            >
              <Search size={12} />
            </button>
          </>
        )}
      </div>

      {/* Session groups */}
      {grouped.length === 0 && (
        <p className="text-[11px] text-[var(--text-muted)] text-center py-6 px-3">
          {searchQuery ? "No results" : "No chats yet"}
        </p>
      )}

      {grouped.map(([group, items]) => {
        const isCollapsed = collapsed.has(group)
        const hasMore = !showMore.has(group) && items.length > 5
        const visible = showMore.has(group) ? items : items.slice(0, 5)

        return (
          <div key={group} className="flex flex-col">
            <button
              onClick={() => toggleGroup(group)}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-dim)] transition-colors select-none"
            >
              <ChevronDown size={10} className={cn("transition-transform shrink-0", isCollapsed && "-rotate-90")} />
              {group}
            </button>

            {!isCollapsed && (
              <div className="flex flex-col pb-1">
                {visible.map((s) => (
                  <SessionItem key={s.id} session={s} isActive={s.id === activeSessionId} onDelete={handleDelete} />
                ))}
                {hasMore && (
                  <button
                    onClick={() => toggleShowMore(group)}
                    className="px-3 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-brand text-left transition-colors"
                  >
                    Show {items.length - 5} more…
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Toggle button (shared style) ──────────────────────────────────────────────

function EdgeToggle({ onClick, direction, label }: { onClick: () => void; direction: "left" | "right"; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 z-20",
        "flex items-center justify-center w-6 h-6 rounded-full",
        "bg-[var(--surface-2)] border border-[var(--border-2)]",
        "shadow-[0_2px_8px_rgba(0,0,0,0.2)]",
        "hover:bg-[var(--surface-3)] transition-all duration-150",
        direction === "right" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2"
      )}
    >
      {direction === "right"
        ? <ChevronRight size={10} className="text-[var(--text-dim)]" />
        : <ChevronLeft size={10} className="text-[var(--text-dim)]" />
      }
    </button>
  )
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const pathname = usePathname()
  const router = useRouter()
  const { activeConnectionId, sidebarCollapsed, toggleSidebar } = useAppStore()
  const { can } = usePermissions()
  const qc = useQueryClient()
  const [newChatLoading, setNewChatLoading] = useState(false)

  const activeSessionId = pathname.startsWith("/chat/") ? pathname.split("/chat/")[1]?.split("?")[0] : undefined

  const { data: allConnections } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connections.list() as Promise<Connection[]>,
  })

  const { data: unreadInsights } = useQuery<Insight[]>({
    queryKey: ["insights", activeConnectionId, "unread"],
    queryFn: () => insightsApi.list(activeConnectionId ?? undefined, true) as Promise<Insight[]>,
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: INSIGHTS_ENABLED && !!activeConnectionId,   // no badge fetch while Insights is hidden
  })

  const unreadCount = unreadInsights?.length ?? 0
  const activeConnection = allConnections?.find((c) => c.id === activeConnectionId) ?? allConnections?.[0] ?? null

  const handleNewChat = useCallback(async () => {
    if (!activeConnectionId || newChatLoading) return
    setNewChatLoading(true)
    try {
      const session = await queryApi.createSession({ connection_id: activeConnectionId })
      qc.invalidateQueries({ queryKey: ["sessions"] })
      router.push(`/chat/${session.id}`)
    } catch {
      router.push("/chat/new")
    } finally {
      setNewChatLoading(false)
    }
  }, [activeConnectionId, newChatLoading, router, qc])

  return (
    <div
      className={cn(
        "relative z-10 flex flex-col h-full bg-[var(--bg)] border-r border-[var(--border)]",
        "transition-all duration-200 shrink-0",
        sidebarCollapsed ? "w-[56px]" : "w-[260px]"
      )}
    >
      {/* Edge toggle button */}
      <EdgeToggle
        onClick={toggleSidebar}
        direction={sidebarCollapsed ? "right" : "left"}
        label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      />

      {/* Sidebar content (overflow hidden to contain internal scrolling) */}
      <div className="flex flex-col h-full w-full overflow-hidden">

        {/* Brand header */}
        <div className={cn("flex items-center h-12 border-b border-[var(--border)] px-4 shrink-0", sidebarCollapsed && "justify-center px-0")}>
          {sidebarCollapsed
            ? <span className="font-mono font-bold text-brand text-sm">Q</span>
            : <span className="font-mono font-bold text-brand tracking-widest text-sm">QUERIFY</span>
          }
        </div>

        {/* Tenant */}
        <div className="border-b border-[var(--border)] shrink-0">
          <TenantSelector collapsed={sidebarCollapsed} />
        </div>

        {/* New Chat button */}
        {sidebarCollapsed ? (
          <div className="px-2 pt-3 pb-2 shrink-0">
            <button
              onClick={handleNewChat}
              disabled={!activeConnectionId || newChatLoading}
              className="flex items-center justify-center w-full py-2 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-40 transition-colors"
              title="New Chat"
            >
              {newChatLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            </button>
          </div>
        ) : (
          <div className="px-3 pt-3 pb-2 shrink-0">
            <button
              onClick={handleNewChat}
              disabled={!activeConnectionId || newChatLoading}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-40 transition-colors"
            >
              {newChatLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              New Chat
            </button>
          </div>
        )}

        {/* Nav items */}
        <nav className={cn("px-2 py-1 flex flex-col gap-0.5 shrink-0", sidebarCollapsed && "px-2")}>
          {NAV_ITEMS.filter(({ permission, enabled }) => enabled !== false && (!permission || can(permission))).map(({ label, icon: Icon, href }) => {
            const isActive = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)
            const showBadge = label === "Insights" && unreadCount > 0
            return (
              <Link
                key={href}
                href={href}
                title={sidebarCollapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors relative",
                  sidebarCollapsed && "justify-center px-0 py-2.5",
                  isActive ? "bg-brand text-white" : "text-[var(--text-dim)] hover:text-brand hover:bg-[var(--brand-light)]"
                )}
              >
                <Icon size={16} className="shrink-0" />
                {!sidebarCollapsed && <span className="flex-1">{label}</span>}
                {showBadge && !sidebarCollapsed && (
                  <span className="flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold leading-none">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
                {showBadge && sidebarCollapsed && (
                  <span className="absolute right-1 top-1 flex items-center justify-center h-3.5 w-3.5 rounded-full bg-danger" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Session history — only when expanded */}
        {!sidebarCollapsed && (
          <div className="flex flex-col flex-1 min-h-0 border-t border-[var(--border)] mt-1">
            <SessionHistory activeSessionId={activeSessionId} />
          </div>
        )}

        {/* Footer */}
        <div className={cn("px-2 py-3 border-t border-[var(--border)] flex flex-col gap-1 shrink-0", sidebarCollapsed && "px-0 items-center")}>
          {activeConnection ? (
            <div className={cn("flex items-center gap-2 px-3 py-2 rounded bg-[var(--surface-2)]", sidebarCollapsed && "px-2 justify-center")}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
              {!sidebarCollapsed && <span className="text-xs text-[var(--text-dim)] truncate">{activeConnection.name}</span>}
            </div>
          ) : (
            !sidebarCollapsed && can("connections:create") && (
              <Link href="/settings/connections/new" className="flex items-center gap-2 px-3 py-2 rounded text-xs text-[var(--text-muted)] hover:text-brand hover:bg-[var(--brand-light)] transition-colors">
                Connect a database
              </Link>
            )
          )}
          <UserFooter collapsed={sidebarCollapsed} />
          {!sidebarCollapsed && (
            <div className="flex items-center justify-start px-1">
              <NotificationPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar
