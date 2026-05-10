"use client"

import { useState, useCallback } from "react"
import { Eye, EyeOff, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { connections } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Spinner from "@/components/ui/Spinner"
import { DbTypeBadge } from "@/components/connections/DbTypeBadge"
import type { ConnectionTestResult } from "@/types"

export interface ConnectionFormData {
  name: string
  db_type: string
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl_mode: string
  instance_name?: string
}

interface StepDetailsProps {
  form: ConnectionFormData
  onChange: (patch: Partial<ConnectionFormData>) => void
  onTestSuccess: (tableCount: number | null) => void
  testPassed: boolean
  onNext: () => void
}

type TestState = "idle" | "testing" | "success" | "failed"

const GENERIC_ERROR_MESSAGES: Record<string, string> = {
  AUTH_FAILED: "Wrong username or password. Check your credentials.",
  DNS_FAILED: "Could not reach the host. Check the hostname.",
  TIMEOUT: "Connection timed out. Check firewall and host.",
  SSL_ERROR: "SSL handshake failed. Try a different SSL mode.",
  CONNECTION_FAILED: "Connection failed. Check your credentials and that the server is accessible.",
}

const MYSQL_ERROR_MESSAGES: Record<string, string> = {
  AUTH_FAILED: "Wrong username or password for MySQL. Check your MySQL user credentials.",
  DNS_FAILED: "Could not reach MySQL at the host. Check the hostname.",
  TIMEOUT: "Connection timed out. Check your MySQL server firewall settings.",
  SSL_ERROR: "SSL handshake failed. Try 'Disabled' or 'Preferred' SSL mode.",
  CONNECTION_FAILED: "MySQL connection failed. Check your credentials and server access.",
}

const getErrorMessage = (errorType: string, dbType: string, host: string): string => {
  if (dbType === "mysql") return MYSQL_ERROR_MESSAGES[errorType] || MYSQL_ERROR_MESSAGES.CONNECTION_FAILED
  if (dbType === "mssql") {
    if (errorType === "AUTH_FAILED") return "SQL Server login failed. Verify your SQL Server credentials and that SQL auth is enabled."
    if (errorType === "DNS_FAILED") return `Cannot reach SQL Server at ${host}. Check the hostname and ensure port 1433 is open. For Azure SQL: use [server].database.windows.net`
    if (errorType === "TIMEOUT") return "SQL Server connection timed out. Check firewall rules and that port 1433 is reachable."
    if (errorType === "SSL_ERROR") return "SSL error on SQL Server. Ensure the server certificate is valid or try adjusting trust settings."
    return "SQL Server connection failed. Check your credentials and network settings."
  }
  return GENERIC_ERROR_MESSAGES[errorType] || "Connection failed."
}

const SSL_OPTIONS_BY_DB: Record<string, { value: string; label: string }[]> = {
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
    { value: "verify-ca", label: "Verify CA" },
  ],
  mssql: [{ value: "require", label: "Required (always encrypted)" }],
}

const HELP_LINKS: Record<string, { href: string; label: string }> = {
  postgres: { href: "/help/database-setup/read-only-user", label: "Read-only user setup for PostgreSQL" },
  mysql: { href: "/help/database-setup/read-only-user-mysql", label: "Read-only user setup for MySQL" },
  mssql: { href: "/help/database-setup/sql-server", label: "SQL Server setup guide" },
}

const stripProtocol = (v: string) => v.replace(/^https?:\/\//, "")
const clampPort = (v: string) => Math.min(Math.max(parseInt(v) || 5432, 1), 65535)

export const StepDetails = ({ form, onChange, onTestSuccess, testPassed, onNext }: StepDetailsProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [testState, setTestState] = useState<TestState>("idle")
  const [testError, setTestError] = useState("")
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const markTouched = useCallback((field: string) => setTouched((p) => ({ ...p, [field]: true })), [])

  const fieldError = (field: keyof ConnectionFormData) => {
    if (!touched[field]) return undefined
    const v = form[field]
    if (field === "port" || field === "instance_name") return undefined
    if (typeof v === "string" && !v.trim()) return "Required"
    return undefined
  }

  const canTest = form.name.trim() && form.host.trim() && form.database.trim() && form.username.trim() && form.password.trim()

  const runTest = async () => {
    setTestState("testing")
    setTestError("")
    try {
      const result = await connections.test({
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
        onTestSuccess(null)
      } else {
        setTestState("failed")
        setTestError(getErrorMessage(result.error_type || "", form.db_type, form.host))
      }
    } catch (err: unknown) {
      setTestState("failed")
      const e = err as { error_type?: string; message?: string }
      setTestError(getErrorMessage(e.error_type || "", form.db_type, form.host))
    }
  }

  const sslOptions = SSL_OPTIONS_BY_DB[form.db_type] ?? SSL_OPTIONS_BY_DB.postgres
  const isMssql = form.db_type === "mssql"
  const helpLink = HELP_LINKS[form.db_type]
  const passwordStrength = form.password.length >= 8 ? "ok" : form.password.length > 0 ? "weak" : null

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <div className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] px-3 py-2">
        <DbTypeBadge dbType={form.db_type} />
        <span className="text-xs text-[var(--text-muted)]">Type locked — set in step 1</span>
      </div>

      <Input
        label="Connection name"
        placeholder="Production DB"
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={() => markTouched("name")}
        error={fieldError("name")}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Host"
            placeholder={isMssql ? "server.database.windows.net" : "db.example.com"}
            value={form.host}
            onChange={(e) => onChange({ host: stripProtocol(e.target.value) })}
            onBlur={() => markTouched("host")}
            error={fieldError("host")}
          />
        </div>
        <Input
          label="Port"
          type="number"
          value={form.port}
          onChange={(e) => onChange({ port: clampPort(e.target.value) })}
        />
      </div>

      {isMssql && (
        <Input
          label="Instance name (optional)"
          placeholder="Leave blank for default instance"
          value={form.instance_name ?? ""}
          onChange={(e) => onChange({ instance_name: e.target.value })}
        />
      )}

      <Input
        label="Database name"
        placeholder="my_database"
        value={form.database}
        onChange={(e) => onChange({ database: e.target.value })}
        onBlur={() => markTouched("database")}
        error={fieldError("database")}
      />

      <Input
        label="Username"
        placeholder="readonly_user"
        value={form.username}
        onChange={(e) => onChange({ username: e.target.value })}
        onBlur={() => markTouched("username")}
        error={fieldError("username")}
      />

      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor="password" className="text-xs font-medium text-[var(--text-dim)]">Password</label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => { onChange({ password: e.target.value }); setTestState("idle") }}
            onBlur={() => markTouched("password")}
            className={cn(
              "w-full h-9 px-3 pr-9 rounded text-sm bg-surface text-[var(--text)]",
              "border outline-none transition-colors placeholder:text-[var(--text-muted)]",
              "focus:ring-2 focus:ring-brand-mid focus:border-brand",
              touched.password && !form.password.trim() ? "border-danger" : "border-[var(--border)]"
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-dim)]"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {touched.password && !form.password.trim() && <p className="text-xs text-danger">Required</p>}
        {passwordStrength === "weak" && <p className="text-xs text-warning">Password is short — at least 8 characters recommended</p>}
        {passwordStrength === "ok" && <p className="text-xs text-success">Password length OK</p>}
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor="ssl_mode" className="text-xs font-medium text-[var(--text-dim)]">SSL mode</label>
        <select
          id="ssl_mode"
          value={form.ssl_mode}
          onChange={(e) => onChange({ ssl_mode: e.target.value })}
          disabled={isMssql}
          className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {sslOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-3 pt-2">
        {testState === "idle" && (
          <Button variant="ghost" onClick={runTest} disabled={!canTest}>Test connection</Button>
        )}
        {testState === "testing" && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-dim)]">
            <Spinner size="sm" />
            Connecting...
          </div>
        )}
        {testState === "success" && (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 size={16} />
            Connected successfully.
          </div>
        )}
        {testState === "failed" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 text-sm text-danger">
              <XCircle size={16} className="shrink-0 mt-0.5" />
              <span>{testError}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={runTest}>Retry</Button>
          </div>
        )}
      </div>

      {helpLink && (
        <a
          href={helpLink.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-brand-mid hover:underline"
        >
          <ExternalLink size={11} />
          {helpLink.label}
        </a>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!testPassed}>Next</Button>
      </div>
    </div>
  )
}

export default StepDetails
