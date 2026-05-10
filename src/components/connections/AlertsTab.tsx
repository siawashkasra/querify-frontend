"use client"
import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { alerts as alertsApi } from "@/lib/api"
import type { Connection, AlertPreferences } from "@/types"

const ALERT_TYPES: { key: keyof AlertPreferences; label: string; description: string; priority: string }[] = [
  { key: "connection_degraded", label: "Connection degraded", description: "Alert when your database connection becomes unreachable.", priority: "High priority" },
  { key: "schema_breaking_change", label: "Schema breaking changes", description: "Alert when schema changes may break your metrics or queries.", priority: "High priority" },
  { key: "confidence_deterioration", label: "AI accuracy declining", description: "Alert when average query confidence drops significantly.", priority: "Medium priority" },
  { key: "context_very_stale", label: "Context outdated", description: "Remind you when context has not been refreshed in a while.", priority: "Low priority" },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${checked ? "bg-violet-600" : "bg-slate-200"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`} />
    </button>
  )
}

export default function AlertsTab({ connection }: { connection: Connection }) {
  const qc = useQueryClient()
  const prefs: AlertPreferences = connection.alert_preferences || {}

  const [local, setLocal] = useState<AlertPreferences>({
    connection_degraded: prefs.connection_degraded ?? true,
    schema_breaking_change: prefs.schema_breaking_change ?? true,
    confidence_deterioration: prefs.confidence_deterioration ?? true,
    context_very_stale: prefs.context_very_stale ?? true,
    email_alerts: prefs.email_alerts ?? true,
  })

  const mutation = useMutation({
    mutationFn: (update: AlertPreferences) => alertsApi.updatePreferences(connection.id, update),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success("Alert preferences saved")
    },
    onError: () => toast.error("Failed to save preferences"),
  })

  const { data: recent = [] } = useQuery({
    queryKey: ["alerts", connection.id],
    queryFn: () => alertsApi.list(connection.id),
  })

  function toggle(key: keyof AlertPreferences, value: boolean) {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    mutation.mutate(updated)
  }

  const unreadCount = recent.filter((a) => !a.is_read).length

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Alert notifications</h3>
        <p className="text-xs text-slate-500 mb-4">Choose which events send you in-app and email notifications for <strong>{connection.name}</strong>.</p>
        <div className="space-y-3">
          {ALERT_TYPES.map(({ key, label, description, priority }) => (
            <div key={key} className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{priority}</span>
              </div>
              <Toggle checked={local[key] as boolean ?? true} onChange={(v) => toggle(key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50">
          <div>
            <p className="text-sm font-medium text-slate-800">Email alerts</p>
            <p className="text-xs text-slate-500 mt-0.5">Receive email notifications for high-priority alerts.</p>
          </div>
          <Toggle checked={local.email_alerts ?? true} onChange={(v) => toggle("email_alerts", v)} />
        </div>
      </div>

      {recent.length > 0 && (
        <div className="border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent alerts {unreadCount > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-semibold">{unreadCount} unread</span>}</h3>
          <div className="space-y-2">
            {recent.slice(0, 5).map((a) => (
              <div key={a.id} className={`flex gap-2 p-2.5 rounded-lg border text-xs ${!a.is_read ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100"}`}>
                <span className={`flex-shrink-0 font-bold ${a.priority === "high" ? "text-red-500" : a.priority === "medium" ? "text-amber-500" : "text-slate-400"}`}>
                  {a.priority === "low" ? "i" : "!"}
                </span>
                <div>
                  <p className="font-medium text-slate-700">{a.title}</p>
                  <p className="text-slate-500 mt-0.5 line-clamp-1">{a.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
