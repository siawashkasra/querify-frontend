"use client"

import { useState, useEffect } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, CheckCircle, XCircle } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { connections as connectionsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Input from "@/components/ui/Input"
import Spinner from "@/components/ui/Spinner"
import type { Connection } from "@/types"

interface EditConnectionModalProps {
  connection: Connection | null
  onClose: () => void
}

type TestState = "idle" | "testing" | "success" | "failed"

export const EditConnectionModal = ({ connection, onClose }: EditConnectionModalProps) => {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: "", host: "", port: "", database: "", username: "", password: "", ssl_mode: "prefer" })
  const [testState, setTestState] = useState<TestState>("idle")
  const [testMessage, setTestMessage] = useState("")
  const [credentialsChanged, setCredentialsChanged] = useState(false)

  useEffect(() => {
    if (connection) {
      setForm({ name: connection.name, host: connection.host, port: String(connection.port), database: connection.database_name, username: connection.username, password: "", ssl_mode: connection.ssl_mode })
      setTestState("idle")
      setCredentialsChanged(false)
    }
  }, [connection])

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value
    setForm((f) => ({ ...f, [field]: val }))
    if (["host", "port", "database", "username", "password"].includes(field)) {
      setCredentialsChanged(true)
      setTestState("idle")
    }
  }

  const handleTest = async () => {
    if (!form.password) { toast.error("Enter password to test"); return }
    setTestState("testing")
    try {
      const result = await connectionsApi.test({ host: form.host, port: Number(form.port), database: form.database, username: form.username, password: form.password, ssl_mode: form.ssl_mode })
      setTestState(result.success ? "success" : "failed")
      setTestMessage(result.message)
    } catch {
      setTestState("failed")
      setTestMessage("Connection test failed")
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const data: Record<string, unknown> = { name: form.name, host: form.host, port: Number(form.port), database: form.database, username: form.username, ssl_mode: form.ssl_mode }
      if (form.password) data.password = form.password
      return connectionsApi.update(connection!.id, data)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Connection updated")
      onClose()
    },
    onError: () => toast.error("Could not save changes"),
  })

  const canSave = !credentialsChanged || testState === "success"

  return (
    <Dialog.Root open={!!connection} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-lg max-h-[90vh] overflow-y-auto",
          "rounded-xl border border-[var(--border)] bg-white shadow-xl p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200"
        )}>
          <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors">
            <X size={16} />
          </Dialog.Close>

          <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-5">Edit connection</Dialog.Title>

          <div className="flex flex-col gap-4">
            <Input label="Connection name" value={form.name} onChange={set("name")} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Host" value={form.host} onChange={set("host")} />
              <Input label="Port" type="number" value={form.port} onChange={set("port")} />
            </div>
            <Input label="Database name" value={form.database} onChange={set("database")} />
            <Input label="Username" value={form.username} onChange={set("username")} />
            <Input label="Password" type="password" value={form.password} onChange={set("password")} helperText="Leave blank to keep current password" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-dim)]">SSL mode</label>
              <select value={form.ssl_mode} onChange={set("ssl_mode")} className="h-9 rounded border border-[var(--border)] bg-white px-3 text-sm text-[var(--text)] outline-none focus:border-brand">
                {["disable", "allow", "prefer", "require"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>

            {credentialsChanged && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleTest}
                  disabled={testState === "testing" || !form.password}
                  className="flex items-center justify-center gap-2 h-9 rounded-lg border border-[var(--border)] text-sm font-medium text-[var(--text-dim)] hover:border-brand hover:text-brand hover:bg-[var(--brand-light)] transition-colors disabled:opacity-50"
                >
                  {testState === "testing" ? <><Spinner size="sm" /> Testing…</> : "Test connection"}
                </button>
                {testState === "success" && (
                  <p className="flex items-center gap-1.5 text-xs text-success"><CheckCircle size={12} /> {testMessage}</p>
                )}
                {testState === "failed" && (
                  <p className="flex items-center gap-1.5 text-xs text-danger"><XCircle size={12} /> {testMessage}</p>
                )}
                {testState === "idle" && (
                  <p className="text-xs text-[var(--text-muted)]">Test connection before saving credential changes.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[var(--text-dim)] hover:bg-[var(--surface-3)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={!canSave || saveMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark disabled:opacity-50 transition-colors"
              >
                {saveMutation.isPending ? <><Spinner size="sm" /> Saving…</> : "Save changes"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default EditConnectionModal
