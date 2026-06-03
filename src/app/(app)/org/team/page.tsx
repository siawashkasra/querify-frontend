"use client"

import { useState, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { formatDistanceToNow } from "date-fns"
import {
  UserPlus, MoreHorizontal, RotateCcw, X, ChevronRight,
  Users, Mail, Shield, UserX, UserCheck, Lock,
  ChevronDown, Check,
} from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import toast from "react-hot-toast"
import Link from "next/link"
import { useAuthStore } from "@/store/authStore"
import { tenant as tenantApi, connections as connectionsApi } from "@/lib/api"
import { usePlan } from "@/hooks/usePlan"
import { usePermissions } from "@/lib/permissions"
import CanDo from "@/components/auth/CanDo"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Spinner from "@/components/ui/Spinner"
import { cn } from "@/lib/cn"
import type { Member, Invitation, MemberStat, ConnectionAccessRule } from "@/lib/api"
import type { Connection } from "@/types"

// ── Role config ────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  tenant_admin: { label: "Admin", className: "bg-brand/10 text-brand border-brand/20" },
  end_user: { label: "Member", className: "bg-surface-3 text-[var(--text-dim)] border-[var(--border)]" },
  billing_admin: { label: "Billing", className: "bg-amber-50 text-amber-700 border-amber-200" },
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-success/10 text-success border-success/20" },
  suspended: { label: "Suspended", className: "bg-danger/10 text-danger border-danger/20" },
  pending: { label: "Pending", className: "bg-amber-50 text-amber-600 border-amber-200" },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, className: "bg-surface-3 text-[var(--text-dim)] border-[var(--border)]" }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.active
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500",
]

function Avatar({ name, email }: { name: string | null; email: string }) {
  const letter = (name?.charAt(0) || email.charAt(0)).toUpperCase()
  const colorIdx = email.charCodeAt(0) % AVATAR_COLORS.length
  return (
    <div className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0",
      AVATAR_COLORS[colorIdx]
    )}>
      {letter}
    </div>
  )
}

// ── Role change confirm dialog ─────────────────────────────────────────────────

function RoleChangeDialog({
  member, newRole, open, onClose,
}: {
  member: Member | null
  newRole: string
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => tenantApi.changeMemberRole(member!.user_id, newRole),
    onSuccess: () => {
      toast.success(`${member?.name || member?.email} is now ${ROLE_CONFIG[newRole]?.label ?? newRole}.`)
      qc.invalidateQueries({ queryKey: ["members"] })
      onClose()
    },
    onError: () => toast.error("Could not change role."),
  })

  const displayName = member?.name || member?.email || ""
  const roleLabel = ROLE_CONFIG[newRole]?.label ?? newRole

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-surface p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
            Change role to {roleLabel}?
          </Dialog.Title>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            <strong className="text-[var(--text)]">{displayName}</strong> will immediately have{" "}
            {roleLabel === "Admin"
              ? "full admin access including connection management and team settings."
              : roleLabel === "Billing"
              ? "billing and invoice management access only."
              : "standard query access only."}
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={() => mutate()}>
              Confirm change
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Remove confirm dialog ──────────────────────────────────────────────────────

function RemoveDialog({
  member, open, onClose,
}: { member: Member | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => tenantApi.removeMember(member!.user_id),
    onSuccess: () => {
      toast.success(`${member?.name || member?.email} removed.`)
      qc.invalidateQueries({ queryKey: ["members"] })
      onClose()
    },
    onError: () => toast.error("Could not remove member."),
  })

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-surface p-6 shadow-xl">
          <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
            Remove {member?.name || member?.email}?
          </Dialog.Title>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            They will lose access immediately. This cannot be undone.
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={() => mutate()}>Remove</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Member row actions ─────────────────────────────────────────────────────────

function MemberActions({
  member,
  onRoleChange,
  onRemove,
}: {
  member: Member
  onRoleChange: (m: Member, role: string) => void
  onRemove: (m: Member) => void
}) {
  const qc = useQueryClient()

  const suspendMutation = useMutation({
    mutationFn: () =>
      member.status === "suspended"
        ? tenantApi.unsuspendMember(member.user_id)
        : tenantApi.suspendMember(member.user_id),
    onSuccess: () => {
      toast.success(member.status === "suspended" ? "Member reactivated." : "Member suspended.")
      qc.invalidateQueries({ queryKey: ["members"] })
    },
    onError: () => toast.error("Could not update member status."),
  })

  const CHANGEABLE_ROLES = [
    { value: "end_user", label: "End User" },
    { value: "billing_admin", label: "Billing Admin" },
    { value: "tenant_admin", label: "Admin" },
  ].filter((r) => r.value !== member.role)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded p-1 text-[var(--text-muted)] hover:bg-surface-2 hover:text-[var(--text-dim)] transition-colors">
          <MoreHorizontal size={15} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-44 rounded-lg border border-[var(--border)] bg-surface shadow-lg p-1"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Change role
          </DropdownMenu.Label>
          {CHANGEABLE_ROLES.map((r) => (
            <DropdownMenu.Item
              key={r.value}
              onSelect={() => onRoleChange(member, r.value)}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--text-dim)] rounded cursor-pointer outline-none hover:bg-surface-2 hover:text-[var(--text)]"
            >
              <Shield size={11} />
              Make {r.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 border-t border-[var(--border)]" />
          <DropdownMenu.Item
            onSelect={() => suspendMutation.mutate()}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-warning rounded cursor-pointer outline-none hover:bg-warning/5"
          >
            {member.status === "suspended" ? <UserCheck size={11} /> : <UserX size={11} />}
            {member.status === "suspended" ? "Reactivate" : "Suspend"}
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={() => onRemove(member)}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-danger rounded cursor-pointer outline-none hover:bg-danger/5"
          >
            <X size={11} />
            Remove from team
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Invite slide-over ──────────────────────────────────────────────────────────

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
}

const INVITE_ROLES = [
  { value: "end_user", label: "End User", description: "Can run queries and view results." },
  { value: "billing_admin", label: "Billing Admin", description: "Can manage billing and invoices only." },
]

function InviteSlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("end_user")
  const [touched, setTouched] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentEmail, setSentEmail] = useState("")

  const emailError = touched && email && !isValidEmail(email) ? "Enter a valid email address" : ""

  const { mutate, isPending, error: mutError } = useMutation({
    mutationFn: () => tenantApi.createInvitation(email.trim().toLowerCase(), role),
    onSuccess: () => {
      setSentEmail(email)
      setSent(true)
      qc.invalidateQueries({ queryKey: ["invitations"] })
    },
  })

  function handleClose() {
    setEmail("")
    setRole("end_user")
    setTouched(false)
    setSent(false)
    setSentEmail("")
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!isValidEmail(email)) return
    mutate()
  }

  const apiError = mutError
    ? ((mutError as { message?: string }).message || "Something went wrong.")
    : ""

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        {/* Slide-over from right */}
        <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface border-l border-[var(--border)] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
                <UserPlus size={14} className="text-brand" />
              </div>
              <Dialog.Title className="text-sm font-semibold text-[var(--text)]">
                Invite team member
              </Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <button className="rounded p-1.5 text-[var(--text-muted)] hover:bg-surface-2 transition-colors">
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {sent ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <Check size={22} className="text-success" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text)]">Invitation sent!</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    An invitation has been sent to <strong>{sentEmail}</strong>.
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => { setSent(false); setEmail("") }}>
                  Invite another
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  error={emailError}
                  placeholder="colleague@company.com"
                  autoComplete="email"
                  autoFocus
                />

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-[var(--text-dim)]">Role</span>
                  {INVITE_ROLES.map(({ value, label, description }) => (
                    <label
                      key={value}
                      className={cn(
                        "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        role === value
                          ? "border-brand bg-brand/5"
                          : "border-[var(--border)] bg-surface-2 hover:border-brand/30"
                      )}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={value}
                        checked={role === value}
                        onChange={() => setRole(value)}
                        className="mt-0.5 accent-brand"
                      />
                      <div>
                        <p className="text-xs font-medium text-[var(--text)]">{label}</p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {apiError && (
                  <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2.5 text-xs text-danger">
                    {apiError}
                  </div>
                )}

                <Button type="submit" loading={isPending} disabled={!email}>
                  <UserPlus size={13} />
                  Send invitation
                </Button>
              </form>
            )}
          </div>

          {/* Pending invitations */}
          <PendingInvitationsPanel />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Pending invitations (in slide-over footer) ─────────────────────────────────

function PendingInvitationsPanel() {
  const qc = useQueryClient()
  const { data: invitations } = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => tenantApi.invitations() as Promise<Invitation[]>,
    staleTime: 30_000,
  })

  const resendMutation = useMutation({
    mutationFn: (id: string) => tenantApi.resendInvitation(id),
    onSuccess: () => { toast.success("Invitation resent."); qc.invalidateQueries({ queryKey: ["invitations"] }) },
    onError: () => toast.error("Could not resend."),
  })
  const cancelMutation = useMutation({
    mutationFn: (id: string) => tenantApi.cancelInvitation(id),
    onSuccess: () => { toast.success("Invitation cancelled."); qc.invalidateQueries({ queryKey: ["invitations"] }) },
    onError: () => toast.error("Could not cancel."),
  })

  const pending = (invitations ?? []).filter((i) => i.status === "pending")
  if (!pending.length) return null

  return (
    <div className="border-t border-[var(--border)] px-6 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
        Pending invitations ({pending.length})
      </p>
      <div className="flex flex-col gap-2">
        {pending.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-[var(--text)] truncate">{inv.invited_email}</p>
              <RoleBadge role={inv.role} />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => resendMutation.mutate(inv.id)}
                disabled={resendMutation.isPending}
                className="px-2 py-1 text-[11px] font-medium text-brand hover:bg-brand/10 rounded transition-colors disabled:opacity-50"
              >
                <RotateCcw size={10} className="inline mr-0.5" /> Resend
              </button>
              <button
                onClick={() => cancelMutation.mutate(inv.id)}
                disabled={cancelMutation.isPending}
                className="px-2 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-danger hover:bg-danger/5 rounded transition-colors disabled:opacity-50"
              >
                <X size={10} className="inline mr-0.5" /> Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Connection access rules ────────────────────────────────────────────────────

const ACCESS_OPTIONS = [
  { value: "all", label: "All team members" },
  { value: "admins", label: "Admins only" },
  { value: "specific", label: "Specific members" },
] as const

function ConnectionAccessSection({
  members,
}: { members: Member[] }) {
  const qc = useQueryClient()

  const { data: conns } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 5 * 60_000,
  })

  const { data: accessRules } = useQuery<ConnectionAccessRule[]>({
    queryKey: ["connection-access"],
    queryFn: () => tenantApi.getConnectionAccess() as Promise<ConnectionAccessRule[]>,
    staleTime: 30_000,
  })

  const [localRules, setLocalRules] = useState<Record<string, { rule: string; memberIds: string[] }>>({})

  function getRule(connId: string) {
    if (localRules[connId]) return localRules[connId]
    const remote = accessRules?.find((r) => r.connection_id === connId)
    return remote ? { rule: remote.rule, memberIds: remote.member_ids } : { rule: "all", memberIds: [] }
  }

  const saveMutation = useMutation({
    mutationFn: ({ connId, rule, memberIds }: { connId: string; rule: "all" | "admins" | "specific"; memberIds: string[] }) =>
      tenantApi.setConnectionAccess(connId, rule, memberIds),
    onSuccess: () => {
      toast.success("Access rule saved.")
      qc.invalidateQueries({ queryKey: ["connection-access"] })
    },
    onError: () => toast.error("Failed to save access rule."),
  })

  function handleRuleChange(connId: string, rule: string) {
    const current = getRule(connId)
    const next = { rule, memberIds: current.memberIds }
    setLocalRules((r) => ({ ...r, [connId]: next }))
    if (rule !== "specific") {
      saveMutation.mutate({ connId, rule: rule as "all" | "admins", memberIds: [] })
    }
  }

  function toggleMember(connId: string, userId: string) {
    const current = getRule(connId)
    const next = current.memberIds.includes(userId)
      ? current.memberIds.filter((id) => id !== userId)
      : [...current.memberIds, userId]
    const nextRule = { rule: "specific", memberIds: next }
    setLocalRules((r) => ({ ...r, [connId]: nextRule }))
    saveMutation.mutate({ connId, rule: "specific", memberIds: next })
  }

  const connections = conns ?? []
  if (!connections.length) return null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-[var(--text-muted)]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Connection Access Rules
        </h2>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Control which team members can query each connection.
      </p>
      <div className="flex flex-col gap-3">
        {connections.map((conn) => {
          const { rule, memberIds } = getRule(conn.id)
          return (
            <div key={conn.id} className="bg-surface rounded-xl border border-[var(--border)] p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-[var(--text)]">{conn.name}</p>
                <select
                  value={rule}
                  onChange={(e) => handleRuleChange(conn.id, e.target.value)}
                  className="h-8 px-2.5 text-xs rounded border border-[var(--border)] bg-surface text-[var(--text)] outline-none focus:ring-1 focus:ring-brand-mid"
                >
                  {ACCESS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {rule === "specific" && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--border)]">
                  {members.filter((m) => m.role !== "tenant_admin").map((m) => {
                    const selected = memberIds.includes(m.user_id)
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => toggleMember(conn.id, m.user_id)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                          selected
                            ? "border-brand bg-brand/5 text-brand"
                            : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand/30"
                        )}
                      >
                        <Avatar name={m.name} email={m.email} />
                        {m.name || m.email}
                        {selected && <Check size={10} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrgTeamPage() {
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null)
  const { isFreePlan, seatLimit } = usePlan()
  const { isAdmin } = usePermissions()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ member: Member; newRole: string } | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  const { data: members, isLoading: membersLoading } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => tenantApi.members() as Promise<Member[]>,
    staleTime: 30_000,
  })

  const { data: memberStats } = useQuery<MemberStat[]>({
    queryKey: ["member-stats"],
    queryFn: () => tenantApi.memberStats() as Promise<MemberStat[]>,
    staleTime: 5 * 60_000,
  })

  const isTeamLocked = isFreePlan && (seatLimit ?? 1) <= 1

  if (isTeamLocked) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Team management requires Starter or above</p>
            <p className="text-xs text-amber-700 mt-0.5">
              The Free tier is single-user. Upgrade to invite team members.
            </p>
          </div>
          <Link
            href="/org/billing"
            className="flex-shrink-0 rounded-lg bg-amber-500 text-white text-xs font-medium px-3 py-1.5 hover:bg-amber-600 transition-colors"
          >
            Upgrade — $29/mo
          </Link>
        </div>
      </div>
    )
  }

  const memberList = members ?? []
  const statMap = new Map((memberStats ?? []).map((s) => [s.user_id, s]))

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {memberList.length} member{memberList.length !== 1 ? "s" : ""}
        </p>
        {isAdmin && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus size={13} /> Invite member
          </Button>
        )}
      </div>

      {/* Members table */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[var(--text-muted)]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Members</h2>
        </div>

        {membersLoading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => <div key={i} className="h-12 rounded-lg animate-pulse bg-surface-2" />)}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-surface-2">
                  {["Member", "Email", "Role", "Status", "Last active", "Queries (mo)", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {memberList.map((m) => {
                  const isSelf = m.user_id === currentUserId
                  const stat = statMap.get(m.user_id)
                  return (
                    <tr key={m.user_id} className="hover:bg-surface-2 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={m.name} email={m.email} />
                          <span className="text-xs font-medium text-[var(--text)]">
                            {m.name || "—"}
                            {isSelf && (
                              <span className="ml-1 text-[10px] text-[var(--text-muted)] font-normal">(you)</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{m.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {m.last_login_at
                          ? formatDistanceToNow(new Date(m.last_login_at), { addSuffix: true })
                          : "Never"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-dim)] tabular-nums">
                        {stat?.queries_this_month?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isSelf && isAdmin && (
                          <MemberActions
                            member={m}
                            onRoleChange={(member, newRole) => setRoleChangeTarget({ member, newRole })}
                            onRemove={setRemoveTarget}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Connection access rules — admins only */}
      {isAdmin && memberList.length > 1 && (
        <ConnectionAccessSection members={memberList} />
      )}

      {/* Dialogs */}
      <InviteSlideOver open={inviteOpen} onClose={() => setInviteOpen(false)} />
      <RoleChangeDialog
        member={roleChangeTarget?.member ?? null}
        newRole={roleChangeTarget?.newRole ?? ""}
        open={!!roleChangeTarget}
        onClose={() => setRoleChangeTarget(null)}
      />
      <RemoveDialog
        member={removeTarget}
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
      />
    </div>
  )
}
