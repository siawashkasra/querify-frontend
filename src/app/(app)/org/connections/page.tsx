"use client"

import { useState, useCallback, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import {
  Plus, Eye, EyeOff, CheckCircle2, XCircle,
  Loader2, Database, RefreshCw, Pencil, Trash2,
  PowerOff, ExternalLink, AlertTriangle, ShieldOff,
} from "lucide-react"
import toast from "react-hot-toast"
import * as Dialog from "@radix-ui/react-dialog"
import { connections as connectionsApi } from "@/lib/api"
import { usePermissions } from "@/lib/permissions"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Spinner from "@/components/ui/Spinner"
import { DbTypeBadge } from "@/components/connections/DbTypeBadge"
import Badge from "@/components/ui/Badge"
import { cn } from "@/lib/cn"
import type { Connection, ConnectionTestResult } from "@/types"

// ── Constants ─────────────────────────────────────────────────────────────────

const DB_TYPES = [
  { value: "postgres", label: "PostgreSQL", defaultPort: 5432, defaultSsl: "prefer" },
  { value: "mysql", label: "MySQL", defaultPort: 3306, defaultSsl: "prefer" },
  { value: "mssql", label: "SQL Server", defaultPort: 1433, defaultSsl: "require" },
]

const SSL_OPTIONS: Record<string, { value: string; label: string }[]> = {
  postgres: [
    { value: "disable", label: "Disabled" },
    { value: "allow", label: "Allow" },
    { value: "prefer", label: "Preferred" },
    { value: "require", label: "Required" },
  ],
  mysql: [
    { value: "disabled", label: "Disabled" },
    { value: "preferred", label: "Preferred" },
    { value: "required", label: "Required" },
  ],
  mssql: [{ value: "require", label: "Required" }],
}

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_FAILED: "Wrong username or password. Check your credentials.",
  DNS_FAILED: "Could not reach the host. Check the hostname and network.",
  TIMEOUT: "Connection timed out. Check firewall and host accessibility.",
  SSL_ERROR: "SSL handshake failed. Try a different SSL mode.",
  CONNECTION_FAILED: "Connection failed. Check credentials and server accessibility.",
}

function getErrorMessage(errorType: string | null): string {
  return errorType ? (ERROR_MESSAGES[errorType] ?? "Connection failed.") : "Connection failed."
}

const STATUS_BADGE: Record<string, "active" | "degraded" | "inactive" | "pending"> = {
  active: "active",
  error: "degraded",
  pending: "pending",
  untested: "inactive",
}

// ── Form state ────────────────────────────────────────────────────────────────

interface ConnForm {
  name: string
  db_type: string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl_mode: string
}

const DEFAULT_FORM: ConnForm = {
  name: "",
  db_type: "postgres",
  host: "",
  port: 5432,
  database: "",
  username: "",
  password: "",
  ssl_mode: "prefer",
}

// ── Connection modal ──────────────────────────────────────────────────────────

type TestState = "idle" | "testing" | "success" | "failed"

function ConnectionModal({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing: Connection | null
}) {
  const qc = useQueryClient()
  const isEdit = editing !== null

  const [form, setForm] = useState<ConnForm>(() =>
    editing
      ? {
          name: editing.name,
          db_type: editing.db_type,
          host: editing.host,
          port: editing.port,
          database: editing.database_name,
          username: editing.username,
          password: "", // never pre-fill password
          ssl_mode: editing.ssl_mode,
        }
      : DEFAULT_FORM
  )
  const [showPassword, setShowPassword] = useState(false)
  const [testState, setTestState] = useState<TestState>("idle")
  const [testError, setTestError] = useState("")
  const [testPassed, setTestPassed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Partial<Record<keyof ConnForm, boolean>>>({})

  const patch = useCallback((p: Partial<ConnForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setTestState("idle")
    setTestPassed(false)
  }, [])

  const markTouched = (field: keyof ConnForm) =>
    setTouched((t) => ({ ...t, [field]: true }))

  const canTest =
    form.host.trim() && form.database.trim() && form.username.trim() &&
    (form.password.trim() || isEdit) // edit: existing password used server-side if blank

  async function runTest() {
    if (!canTest) return
    setTestState("testing")
    setTestError("")
    try {
      const result = isEdit && !form.password
        ? await connectionsApi.testExisting(editing!.id) as ConnectionTestResult
        : await connectionsApi.test({
            host: form.host,
            port: form.port,
            database: form.database,
            username: form.username,
            password: form.password,
            ssl_mode: form.ssl_mode,
            db_type: form.db_type,
          }) as ConnectionTestResult

      if (result.success) {
        setTestState("success")
        setTestPassed(true)
      } else {
        setTestState("failed")
        setTestError(getErrorMessage(result.error_type))
      }
    } catch (err: unknown) {
      setTestState("failed")
      const e = err as { error_type?: string }
      setTestError(getErrorMessage(e.error_type ?? null))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (isEdit) {
        await connectionsApi.update(editing!.id, {
          name: form.name,
          host: form.host,
          port: form.port,
          database: form.database,
          username: form.username,
          ssl_mode: form.ssl_mode,
          ...(form.password ? { password: form.password } : {}),
        })
        toast.success("Connection updated.")
      } else {
        await connectionsApi.create({
          name: form.name,
          db_type: form.db_type,
          host: form.host,
          port: form.port,
          database: form.database,
          username: form.username,
          password: form.password,
          ssl_mode: form.ssl_mode,
        })
        toast.success("Connection added.")
      }
      await qc.invalidateQueries({ queryKey: ["connections"] })
      onClose()
    } catch (err: unknown) {
      const e = err as { message?: string }
      toast.error(e.message || "Failed to save connection.")
    } finally {
      setSaving(false)
    }
  }

  const sslOptions = SSL_OPTIONS[form.db_type] ?? SSL_OPTIONS.postgres
  const isMssql = form.db_type === "mssql"
  const HELP_LINKS: Record<string, string> = {
    postgres: "/help/database-setup/read-only-user",
    mysql: "/help/database-setup/read-only-user-mysql",
    mssql: "/help/database-setup/sql-server",
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg)] rounded-xl shadow-xl border border-[var(--border)]">
          <div className="p-6 flex flex-col gap-5">
            {/* Header */}
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                {isEdit ? "Edit connection" : "Add connection"}
              </Dialog.Title>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {isEdit ? "Update your database connection settings." : "Connect a database to start querying with AI."}
              </p>
            </div>

            {/* DB type selector (add only) */}
            {!isEdit && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-dim)]">Database type</label>
                <div className="flex gap-2 flex-wrap">
                  {DB_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => patch({ db_type: t.value, port: t.defaultPort, ssl_mode: t.defaultSsl })}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                        form.db_type === t.value
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-[var(--border)] text-[var(--text-muted)] hover:border-brand/40"
                      )}
                    >
                      <DbTypeBadge dbType={t.value as never} />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connection name */}
            <Input
              label="Connection name"
              placeholder="Production DB"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              onBlur={() => markTouched("name")}
              error={touched.name && !form.name.trim() ? "Required" : undefined}
            />

            {/* Host + Port */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Host"
                  placeholder={isMssql ? "server.database.windows.net" : "db.example.com"}
                  value={form.host}
                  onChange={(e) => patch({ host: e.target.value.replace(/^https?:\/\//, "") })}
                  onBlur={() => markTouched("host")}
                  error={touched.host && !form.host.trim() ? "Required" : undefined}
                />
              </div>
              <Input
                label="Port"
                type="number"
                value={form.port}
                onChange={(e) => patch({ port: Math.min(Math.max(parseInt(e.target.value) || 5432, 1), 65535) })}
              />
            </div>

            {/* Database name */}
            <Input
              label="Database name"
              placeholder="my_database"
              value={form.database}
              onChange={(e) => patch({ database: e.target.value })}
              onBlur={() => markTouched("database")}
              error={touched.database && !form.database.trim() ? "Required" : undefined}
            />

            {/* Username */}
            <Input
              label="Username"
              placeholder="readonly_user"
              value={form.username}
              onChange={(e) => patch({ username: e.target.value })}
              onBlur={() => markTouched("username")}
              error={touched.username && !form.username.trim() ? "Required" : undefined}
            />

            {/* Password — never pre-filled, always masked */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-dim)]">
                Password
                {isEdit && (
                  <span className="ml-1 text-[var(--text-muted)] font-normal">
                    — leave blank to keep current
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={isEdit ? "Enter new password to change" : "••••••••"}
                  value={form.password}
                  onChange={(e) => patch({ password: e.target.value })}
                  className="w-full h-9 px-3 pr-9 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid placeholder:text-[var(--text-muted)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-dim)]"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {/* Security notice */}
              <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <ShieldOff size={10} className="opacity-60" />
                Password is encrypted at rest and never shown after saving.
              </p>
            </div>

            {/* SSL mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-dim)]">SSL mode</label>
              <select
                value={form.ssl_mode}
                onChange={(e) => patch({ ssl_mode: e.target.value })}
                disabled={isMssql}
                className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid disabled:opacity-60"
              >
                {sslOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Test button + state */}
            <div className="flex flex-col gap-2">
              {testState === "idle" && (
                <Button variant="ghost" onClick={runTest} disabled={!canTest}>
                  Test connection
                </Button>
              )}
              {testState === "testing" && (
                <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
                  <Spinner size="sm" /> Connecting…
                </div>
              )}
              {testState === "success" && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 size={15} /> Connected successfully.
                </div>
              )}
              {testState === "failed" && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2 text-sm text-danger">
                    <XCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{testError}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={runTest}>Retry</Button>
                </div>
              )}
            </div>

            {/* Help link */}
            {HELP_LINKS[form.db_type] && (
              <a
                href={HELP_LINKS[form.db_type]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-mid hover:underline flex items-center gap-1"
              >
                <ExternalLink size={11} />
                Need help? See our connection guide
              </a>
            )}

            {/* Footer actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!testPassed || saving || !form.name.trim()}
                loading={saving}
              >
                {isEdit ? "Save changes" : "Save connection"}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Delete confirm dialog ─────────────────────────────────────────────────────

function DeleteDialog({
  conn,
  open,
  onClose,
}: {
  conn: Connection | null
  open: boolean
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { mutate, isPending } = useMutation({
    mutationFn: () => connectionsApi.delete(conn!.id),
    onSuccess: () => {
      toast.success(`"${conn!.name}" deleted.`)
      qc.invalidateQueries({ queryKey: ["connections"] })
      onClose()
    },
    onError: () => toast.error("Failed to delete connection."),
  })

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-[var(--bg)] rounded-xl border border-[var(--border)] p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-danger/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-danger" />
            </div>
            <Dialog.Title className="text-sm font-semibold text-[var(--text)]">Delete connection?</Dialog.Title>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            <strong className="text-[var(--text)]">{conn?.name}</strong> and all its query history will be permanently removed. This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="danger" onClick={() => mutate()} loading={isPending}>Delete</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OrgConnectionsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { isAdmin } = usePermissions()
  const [addOpen, setAddOpen] = useState(false)
  const [editConn, setEditConn] = useState<Connection | null>(null)
  const [deleteConn, setDeleteConn] = useState<Connection | null>(null)

  const { data: conns, isLoading } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
    staleTime: 30_000,
  })

  const testMutation = useMutation({
    mutationFn: (id: string) => connectionsApi.testExisting(id),
    onSuccess: (_, id) => {
      toast.success("Connection test passed.")
      qc.invalidateQueries({ queryKey: ["connections"] })
    },
    onError: () => toast.error("Connection test failed."),
  })

  const connections = conns ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-muted)]">
          {connections.length} connection{connections.length !== 1 ? "s" : ""}
        </p>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus size={13} /> Add connection
          </Button>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="md" />
        </div>
      ) : connections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Database size={32} className="text-[var(--text-muted)]" />
          <div>
            <p className="text-sm font-medium text-[var(--text)]">No connections yet</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Add a database connection to start querying with AI.</p>
          </div>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)} size="sm"><Plus size={13} /> Add connection</Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border)] bg-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-surface-2">
                {["Name", "Type", "Status", "Last tested", "Tables", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => router.push(`/org/connections/${conn.id}`)}
                      className="font-medium text-[var(--text)] hover:text-brand transition-colors flex items-center gap-1.5"
                    >
                      {conn.name}
                      <ExternalLink size={11} className="opacity-40" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <DbTypeBadge dbType={conn.db_type} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[conn.status] ?? "default"}>
                      {conn.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {conn.last_tested_at
                      ? formatDistanceToNow(new Date(conn.last_tested_at), { addSuffix: true })
                      : "Never"}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-dim)] tabular-nums">
                    {conn.table_count ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* Test */}
                      <button
                        onClick={() => testMutation.mutate(conn.id)}
                        disabled={testMutation.isPending && testMutation.variables === conn.id}
                        title="Test connection"
                        className="p-1.5 rounded hover:bg-surface-3 text-[var(--text-muted)] hover:text-brand transition-colors disabled:opacity-50"
                      >
                        {testMutation.isPending && testMutation.variables === conn.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <RefreshCw size={13} />}
                      </button>
                      {isAdmin && (
                        <>
                          {/* Edit */}
                          <button
                            onClick={() => setEditConn(conn)}
                            title="Edit"
                            className="p-1.5 rounded hover:bg-surface-3 text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                          >
                            <Pencil size={13} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConn(conn)}
                            title="Delete"
                            className="p-1.5 rounded hover:bg-danger/10 text-[var(--text-muted)] hover:text-danger transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <ConnectionModal
        open={addOpen || editConn !== null}
        onClose={() => { setAddOpen(false); setEditConn(null) }}
        editing={editConn}
      />
      <DeleteDialog
        conn={deleteConn}
        open={deleteConn !== null}
        onClose={() => setDeleteConn(null)}
      />
    </div>
  )
}
