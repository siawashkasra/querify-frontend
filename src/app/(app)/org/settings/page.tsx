"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { AlertTriangle, Save, Trash2, Loader2, Globe, Bell, Clock } from "lucide-react"
import { tenant as tenantApi } from "@/lib/api"
import type { TenantInfo } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import { cn } from "@/lib/cn"

// ── Timezone options ───────────────────────────────────────────────────────────

const TIMEZONES = [
  "UTC", "America/New_York", "America/Chicago", "America/Denver",
  "America/Los_Angeles", "America/Toronto", "America/Vancouver",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
  "Europe/Madrid", "Europe/Rome", "Europe/Stockholm", "Europe/Helsinki",
  "Asia/Tokyo", "Asia/Seoul", "Asia/Shanghai", "Asia/Singapore",
  "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
]

const RETENTION_OPTIONS = [
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
  { value: null, label: "Plan default" },
]

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({
  title, description, icon: Icon, children,
}: {
  title: string
  description?: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-xl border border-[var(--border)] p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-surface-2 border border-[var(--border)] flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={14} className="text-[var(--text-muted)]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrgSettingsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const logout = useAuthStore((s) => s.logout)

  const { data: org, isLoading } = useQuery<TenantInfo>({
    queryKey: ["tenant"],
    queryFn: () => tenantApi.get() as Promise<TenantInfo>,
    staleTime: 5 * 60_000,
  })

  // Local form state
  const [name, setName] = useState("")
  const [timezone, setTimezone] = useState("UTC")
  const [notificationEmail, setNotificationEmail] = useState("")
  const [retentionDays, setRetentionDays] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)

  // Sync form from loaded data
  useEffect(() => {
    if (org) {
      setName(org.name)
      setTimezone(org.timezone || "UTC")
      setNotificationEmail(org.notification_email ?? "")
      setRetentionDays(org.data_retention_days ?? null)
      setDirty(false)
    }
  }, [org])

  function markDirty<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setDirty(true) }
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      tenantApi.updateSettings({
        name: name.trim(),
        timezone,
        notification_email: notificationEmail.trim() || null,
        data_retention_days: retentionDays,
      }),
    onSuccess: () => {
      toast.success("Settings saved.")
      qc.invalidateQueries({ queryKey: ["tenant"] })
      setDirty(false)
    },
    onError: (err: unknown) => {
      const e = err as { message?: string }
      toast.error(e.message || "Failed to save settings.")
    },
  })

  // ── Danger zone: delete org ───────────────────────────────────────────────

  const [deleteConfirmInput, setDeleteConfirmInput] = useState("")
  const [showDeleteZone, setShowDeleteZone] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => tenantApi.delete(),
    onSuccess: () => {
      toast.success("Organisation deleted.")
      logout()
      fetch("/api/auth/session", { method: "DELETE" }).catch(() => {})
      router.push("/login")
    },
    onError: (err: unknown) => {
      const e = err as { message?: string }
      toast.error(e.message || "Failed to delete organisation.")
    },
  })

  const canDelete = deleteConfirmInput === (org?.name ?? "__NONE__")

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertTriangle size={24} className="text-warning" />
        <p className="text-sm text-[var(--text-muted)]">Organisation settings are only available to admins.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-xl">
      {/* Organisation name */}
      <Section title="Organisation name" icon={Globe}>
        <Input
          label="Name"
          value={name}
          onChange={(e) => markDirty(setName)(e.target.value)}
          placeholder="Acme Corp"
        />
      </Section>

      {/* Timezone */}
      <Section
        title="Timezone"
        description="Used for insight scheduling and digest emails."
        icon={Globe}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-dim)]">Timezone</label>
          <select
            value={timezone}
            onChange={(e) => markDirty(setTimezone)(e.target.value)}
            className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Notification email */}
      <Section
        title="Notification email"
        description="Receives system alerts: degraded connections, approaching query limits."
        icon={Bell}
      >
        <Input
          label="Email address"
          type="email"
          placeholder="ops@example.com"
          value={notificationEmail}
          onChange={(e) => markDirty(setNotificationEmail)(e.target.value)}
        />
      </Section>

      {/* Data retention */}
      <Section
        title="Data retention"
        description="Query history retention period. Cannot exceed your plan limit."
        icon={Clock}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-[var(--text-dim)]">Retention period</label>
          <select
            value={retentionDays ?? ""}
            onChange={(e) => markDirty(setRetentionDays)(e.target.value === "" ? null : Number(e.target.value))}
            className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid"
          >
            {RETENTION_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ?? ""}>{o.label}</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!dirty || saveMutation.isPending}
          loading={saveMutation.isPending}
        >
          <Save size={13} />
          Save changes
        </Button>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border-2 border-danger/30 bg-danger/5 p-5 flex flex-col gap-4 mt-4">
        <div className="flex items-start gap-3">
          <AlertTriangle size={16} className="text-danger shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">Danger zone</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Permanently delete this organisation and all associated data, connections, and query history.
              This cannot be undone.
            </p>
          </div>
        </div>

        {!showDeleteZone ? (
          <button
            onClick={() => setShowDeleteZone(true)}
            className="text-sm text-danger hover:underline text-left w-fit"
          >
            Delete organisation…
          </button>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-[var(--text-muted)]">
              Type <strong className="text-[var(--text)] font-mono">{org?.name}</strong> to confirm deletion.
            </p>
            <input
              type="text"
              placeholder={`Type "${org?.name}" to confirm`}
              value={deleteConfirmInput}
              onChange={(e) => setDeleteConfirmInput(e.target.value)}
              className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-danger/40 outline-none focus:ring-2 focus:ring-danger/20"
            />
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => { setShowDeleteZone(false); setDeleteConfirmInput("") }}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!canDelete || deleteMutation.isPending}
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
              >
                <Trash2 size={12} />
                Delete permanently
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
