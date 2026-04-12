"use client"

import { useState, useCallback } from "react"
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"
import { connections } from "@/lib/api"
import { cn } from "@/lib/cn"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"
import Spinner from "@/components/ui/Spinner"
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
}

interface StepDetailsProps {
  form: ConnectionFormData
  onChange: (patch: Partial<ConnectionFormData>) => void
  onTestSuccess: (tableCount: number | null) => void
  testPassed: boolean
  onNext: () => void
}

type TestState = "idle" | "testing" | "success" | "failed"

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_FAILED: "Wrong username or password. Check your credentials.",
  DNS_FAILED: "Could not reach the host. Check the hostname.",
  TIMEOUT: "Connection timed out. Check firewall and host.",
  SSL_ERROR: "SSL handshake failed. Try a different SSL mode.",
  CONNECTION_FAILED: "Connection failed. Check your credentials and that the server is accessible.",
}

const SSL_OPTIONS = ["disable", "allow", "prefer", "require"]
const DB_TYPES = [
  { value: "postgres", label: "PostgreSQL" },
  { value: "mysql", label: "MySQL", disabled: true },
  { value: "mssql", label: "SQL Server", disabled: true },
]

const stripProtocol = (v: string) => v.replace(/^https?:\/\//, "")
const clampPort = (v: string) => Math.min(Math.max(parseInt(v) || 5432, 1), 65535)

export const StepDetails = ({ form, onChange, onTestSuccess, testPassed, onNext }: StepDetailsProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [testState, setTestState] = useState<TestState>("idle")
  const [testError, setTestError] = useState("")
  const [tableCount, setTableCount] = useState<number | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const markTouched = useCallback((field: string) => setTouched((p) => ({ ...p, [field]: true })), [])

  const fieldError = (field: keyof ConnectionFormData) => {
    if (!touched[field]) return undefined
    const v = form[field]
    if (field === "port") return undefined
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
      }) as ConnectionTestResult
      if (result.success) {
        setTestState("success")
        setTableCount(null)
        onTestSuccess(null)
      } else {
        setTestState("failed")
        setTestError(ERROR_MESSAGES[result.error_type || ""] || result.message || "Connection failed.")
      }
    } catch (err: unknown) {
      setTestState("failed")
      const e = err as { error_type?: string; message?: string }
      setTestError(ERROR_MESSAGES[e.error_type || ""] || e.message || "Connection failed.")
    }
  }

  const passwordStrength = form.password.length >= 8 ? "ok" : form.password.length > 0 ? "weak" : null

  return (
    <div className="flex flex-col gap-5 max-w-lg">
      <Input
        label="Connection name"
        placeholder="Production DB"
        value={form.name}
        onChange={(e) => onChange({ name: e.target.value })}
        onBlur={() => markTouched("name")}
        error={fieldError("name")}
      />

      <div className="flex flex-col gap-1.5 w-full">
        <label className="text-xs font-medium text-[var(--text-dim)]">Database type</label>
        <select
          value={form.db_type}
          onChange={(e) => onChange({ db_type: e.target.value })}
          className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid"
        >
          {DB_TYPES.map((d) => (
            <option key={d.value} value={d.value} disabled={d.disabled}>
              {d.label}{d.disabled ? " (coming soon)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Host"
            placeholder="db.example.com"
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
        <label className="text-xs font-medium text-[var(--text-dim)]">Password</label>
        <div className="relative">
          <input
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
        <label className="text-xs font-medium text-[var(--text-dim)]">SSL mode</label>
        <select
          value={form.ssl_mode}
          onChange={(e) => onChange({ ssl_mode: e.target.value })}
          className="w-full h-9 px-3 rounded text-sm bg-surface text-[var(--text)] border border-[var(--border)] outline-none focus:ring-2 focus:ring-brand-mid"
        >
          {SSL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
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
            Connected successfully.{tableCount !== null && ` ${tableCount} tables found.`}
          </div>
        )}
        {testState === "failed" && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm text-danger">
              <XCircle size={16} />
              {testError}
            </div>
            <Button variant="ghost" size="sm" onClick={runTest}>Retry</Button>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!testPassed}>Next</Button>
      </div>
    </div>
  )
}

export default StepDetails
