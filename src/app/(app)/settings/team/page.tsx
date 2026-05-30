"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { UserPlus, MoreHorizontal, RotateCcw, X, ChevronDown, Users, Mail } from "lucide-react"
import { toast } from "react-hot-toast"
import * as Dialog from "@radix-ui/react-dialog"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useAuthStore } from "@/store/authStore"
import { tenant as tenantApi } from "@/lib/api"
import { usePlan } from "@/hooks/usePlan"
import CanDo from "@/components/auth/CanDo"
import InviteMemberModal from "@/components/team/InviteMemberModal"
import Button from "@/components/ui/Button"
import { UpgradePromptInline } from "@/components/billing/UpgradePrompt"
import { cn } from "@/lib/cn"
import type { Member, Invitation } from "@/lib/api"

// ── Role badge ─────────────────────────────────────────────────────────────────

const ROLE_CONFIG: Record<string, { label: string; className: string }> = {
  tenant_admin: { label: "Admin", className: "bg-brand/10 text-brand border-brand/20" },
  end_user: { label: "Member", className: "bg-surface-3 text-[var(--text-dim)] border-[var(--border)]" },
  billing_admin: { label: "Billing", className: "bg-amber-50 text-amber-700 border-amber-200" },
}

function RoleBadge({ role }: { role: string }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, className: "bg-surface-3 text-[var(--text-dim)] border-[var(--border)]" }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  )
}

// ── Remove member confirm dialog ───────────────────────────────────────────────

function RemoveMemberDialog({
  member,
  open,
  onClose,
}: {
  member: Member | null
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => tenantApi.removeMember(member!.user_id),
    onSuccess: () => {
      toast.success(`${member!.name || member!.email} has been removed.`)
      qc.invalidateQueries({ queryKey: ["members"] })
      onClose()
    },
    onError: () => {
      toast.error("Could not remove member. Check they are not the last admin.")
    },
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
            They will lose access to this workspace immediately. This cannot be undone.
          </p>
          <div className="mt-5 flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={() => mutate()}>
              Remove member
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Member row actions ─────────────────────────────────────────────────────────

function MemberActions({
  member,
  onRemove,
}: {
  member: Member
  onRemove: (m: Member) => void
}) {
  const qc = useQueryClient()
  const { mutate: changeRole, isPending } = useMutation({
    mutationFn: (role: string) => tenantApi.changeMemberRole(member.user_id, role),
    onSuccess: () => {
      toast.success("Role updated.")
      qc.invalidateQueries({ queryKey: ["members"] })
    },
    onError: () => toast.error("Could not update role."),
  })

  const CHANGEABLE_ROLES = [
    { value: "end_user", label: "End User" },
    { value: "billing_admin", label: "Billing Admin" },
  ]

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
          className="z-50 min-w-40 rounded-lg border border-[var(--border)] bg-surface shadow-lg p-1"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Change role
          </DropdownMenu.Label>
          {CHANGEABLE_ROLES.filter((r) => r.value !== member.role).map((r) => (
            <DropdownMenu.Item
              key={r.value}
              onSelect={() => changeRole(r.value)}
              disabled={isPending}
              className="flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--text-dim)] rounded cursor-pointer outline-none hover:bg-surface-2 hover:text-[var(--text)] data-[disabled]:opacity-50"
            >
              <ChevronDown size={11} className="rotate-[-90deg]" />
              Make {r.label}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 border-t border-[var(--border)]" />
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

// ── Members table ─────────────────────────────────────────────────────────────

function MembersSection({ currentUserId }: { currentUserId: string | null }) {
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null)

  const { data: members, isLoading, error } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: () => tenantApi.members() as Promise<Member[]>,
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 rounded-lg animate-pulse bg-surface-2" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-xs text-[var(--text-muted)]">Could not load members.</p>
  }

  return (
    <>
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-surface-2">
              {["Name", "Email", "Role", "Last active", ""].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members?.map((m, i) => {
              const isSelf = m.user_id === currentUserId
              return (
                <tr
                  key={m.user_id}
                  className={cn("border-b border-[var(--border)] last:border-0", i % 2 === 1 && "bg-surface-2/40")}
                >
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-[var(--text)]">
                      {m.name || "—"}
                      {isSelf && (
                        <span className="ml-1.5 text-[10px] text-[var(--text-muted)] font-normal">(you)</span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{m.email}</td>
                  <td className="px-4 py-3"><RoleBadge role={m.role} /></td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {m.last_login_at
                      ? formatDistanceToNow(new Date(m.last_login_at), { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isSelf && (
                      <CanDo permission="members:change_role">
                        <MemberActions member={m} onRemove={setRemoveTarget} />
                      </CanDo>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <RemoveMemberDialog
        member={removeTarget}
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
      />
    </>
  )
}

// ── Invitations table ─────────────────────────────────────────────────────────

function expiresIn(expiresAt: string): { label: string; expired: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now()
  if (ms <= 0) return { label: "Expired", expired: true }
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return { label: "< 1 hour", expired: false }
  if (hours < 24) return { label: `${hours}h`, expired: false }
  return { label: `${Math.floor(hours / 24)}d`, expired: false }
}

function InvitationsSection() {
  const qc = useQueryClient()

  const { data: invitations, isLoading } = useQuery<Invitation[]>({
    queryKey: ["invitations"],
    queryFn: () => tenantApi.invitations() as Promise<Invitation[]>,
    staleTime: 30_000,
  })

  const { mutate: cancel, isPending: cancelling } = useMutation({
    mutationFn: (id: string) => tenantApi.cancelInvitation(id),
    onSuccess: () => {
      toast.success("Invitation cancelled.")
      qc.invalidateQueries({ queryKey: ["invitations"] })
    },
    onError: () => toast.error("Could not cancel invitation."),
  })

  const { mutate: resend, isPending: resending } = useMutation({
    mutationFn: (id: string) => tenantApi.resendInvitation(id),
    onSuccess: () => {
      toast.success("Invitation resent.")
      qc.invalidateQueries({ queryKey: ["invitations"] })
    },
    onError: () => toast.error("Could not resend invitation."),
  })

  if (isLoading) return <div className="h-10 animate-pulse rounded-lg bg-surface-2" />
  if (!invitations?.length) return (
    <p className="text-xs text-[var(--text-muted)] py-2">No pending invitations.</p>
  )

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-surface-2">
            {["Email", "Role", "Expires", ""].map((h) => (
              <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invitations.map((inv, i) => {
            const exp = expiresIn(inv.expires_at)
            return (
              <tr
                key={inv.id}
                className={cn("border-b border-[var(--border)] last:border-0", i % 2 === 1 && "bg-surface-2/40")}
              >
                <td className="px-4 py-3 text-xs text-[var(--text-dim)]">{inv.invited_email}</td>
                <td className="px-4 py-3"><RoleBadge role={inv.role} /></td>
                <td className="px-4 py-3">
                  {exp.expired ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-danger/10 text-danger border border-danger/20">
                      Expired
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">{exp.label}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    <CanDo permission="members:invite">
                      <button
                        onClick={() => resend(inv.id)}
                        disabled={resending}
                        title={exp.expired ? "Re-invite" : "Resend"}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-brand hover:bg-brand/10 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw size={11} />
                        {exp.expired ? "Re-invite" : "Resend"}
                      </button>
                    </CanDo>
                    <CanDo permission="members:invite">
                      <button
                        onClick={() => cancel(inv.id)}
                        disabled={cancelling}
                        title="Cancel"
                        className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-[var(--text-muted)] hover:bg-surface-3 hover:text-danger transition-colors disabled:opacity-50"
                      >
                        <X size={11} />
                        Cancel
                      </button>
                    </CanDo>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const currentUserId = useAuthStore((s) => s.user?.userId ?? null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const { isFreePlan, seatLimit } = usePlan()
  const isTeamLocked = isFreePlan && (seatLimit ?? 1) <= 1

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text)]">Team</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Manage members and invitations for this workspace.
            </p>
          </div>
          <CanDo permission="members:invite">
            {isTeamLocked ? (
              <Button size="sm" variant="secondary" disabled>
                <UserPlus size={13} />
                Invite member
              </Button>
            ) : (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus size={13} />
                Invite member
              </Button>
            )}
          </CanDo>
        </div>

        {isTeamLocked && (
          <UpgradePromptInline
            feature="Team access"
            plan="Starter"
            price={29}
          />
        )}

        {/* Members */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Members</h2>
          </div>
          <MembersSection currentUserId={currentUserId} />
        </section>

        {/* Pending invitations */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-[var(--text-muted)]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pending Invitations</h2>
          </div>
          <InvitationsSection />
        </section>

      </div>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  )
}
