"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { User, Lock, AlertTriangle } from "lucide-react"
import { me as meApi, auth as authApi } from "@/lib/api"
import { useAuth } from "@/hooks/useAuth"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import type { UserProfile } from "@/lib/api"

// ── Profile section ───────────────────────────────────────────────────────────

function ProfileSection() {
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["me-profile"],
    queryFn: () => meApi.profile() as Promise<UserProfile>,
    staleTime: 60_000,
  })

  const [name, setName] = useState("")
  useEffect(() => { if (profile?.name) setName(profile.name) }, [profile])

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => meApi.updateProfile(name.trim()),
    onSuccess: () => toast.success("Name updated."),
    onError: () => toast.error("Could not update name."),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-3" />
        <div className="h-9 w-full animate-pulse rounded bg-surface-3" />
      </div>
    )
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); save() }} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-[var(--text-muted)]">Email</p>
        <p className="text-sm text-[var(--text-dim)]">{profile?.email}</p>
      </div>
      <Input
        label="Display name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
      />
      <div>
        <Button type="submit" size="sm" loading={isPending} disabled={!name.trim()}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

// ── Change password section ───────────────────────────────────────────────────

function ChangePasswordSection() {
  const { logout } = useAuth()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [apiError, setApiError] = useState("")
  const [success, setSuccess] = useState(false)

  const lengthOk = next.length >= 8
  const matchOk = next === confirm
  const formValid = Boolean(current && lengthOk && matchOk)

  const { mutate: changePassword, isPending } = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: () => {
      setSuccess(true)
      toast.success("Password changed.")
      setTimeout(() => logout(), 2000)
    },
    onError: (e: { message?: string }) => {
      setApiError(e.message || "Could not change password. Check your current password.")
    },
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setApiError("")
    if (!formValid) return
    changePassword()
  }

  if (success) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
        Password changed. You will be asked to log in again in a moment…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Current password"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
      />
      <Input
        label="New password"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        error={next.length > 0 && !lengthOk ? "Use at least 8 characters" : ""}
        helperText="Minimum 8 characters"
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        error={confirm.length > 0 && !matchOk ? "Passwords do not match" : ""}
      />
      {apiError && <p className="text-xs text-danger">{apiError}</p>}
      <div>
        <Button type="submit" size="sm" loading={isPending} disabled={!formValid}>
          Change password
        </Button>
      </div>
    </form>
  )
}

// ── Danger zone ───────────────────────────────────────────────────────────────

function DangerZone() {
  return (
    <div className="rounded-xl border border-danger/20 p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={14} className="text-danger" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-danger">Danger zone</h3>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Delete my account</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Permanently delete your account and all associated data.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            toast("To delete your account, please contact support@querify.app", {
              duration: 6000,
              icon: "📧",
            })
          }
          className="shrink-0 text-xs font-medium text-danger hover:underline focus-visible:outline-none"
        >
          Delete account
        </button>
      </div>
      <p className="text-[11px] text-[var(--text-muted)] border-t border-[var(--border)] pt-2 mt-1">
        Self-serve account deletion is coming soon. Until then, please contact support to delete your account.
      </p>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--border)] bg-surface-2">
        <Icon size={14} className="text-[var(--text-muted)]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountPage() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">My Account</h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Manage your profile and security settings.</p>
        </div>

        <Section icon={User} title="Profile">
          <ProfileSection />
        </Section>

        <Section icon={Lock} title="Password">
          <ChangePasswordSection />
        </Section>

        <DangerZone />
      </div>
    </div>
  )
}
