"use client"
import { useEffect, useRef, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Bell, X, AlertCircle, Info, ExternalLink } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { alerts as alertsApi, connections as connectionsApi } from "@/lib/api"
import type { ConnectionAlert, AlertPriority, Connection } from "@/types"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

const cn = (...inputs: Parameters<typeof clsx>) => twMerge(clsx(inputs))

function priorityIcon(priority: AlertPriority) {
  if (priority === "high") return <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
  if (priority === "medium") return <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
  return <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
}

function AlertRow({ alert, onAck, connectionName }: { alert: ConnectionAlert; onAck: (id: string) => void; connectionName?: string }) {
  return (
    <div className={cn("p-3 rounded-lg border flex gap-3 transition-colors", !alert.is_read ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100")}>
      <div className="mt-0.5">{priorityIcon(alert.priority)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 leading-tight">{alert.title}</p>
        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {connectionName && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-violet-50 text-violet-700 border border-violet-200">{connectionName}</span>}
          <span className="text-[11px] text-slate-400">{formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}</span>
        </div>
        {alert.action_label && alert.action_url && (
          <a href={alert.action_url} className="mt-2 inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium">
            {alert.action_label} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
      <button onClick={() => onAck(alert.id)} className="flex-shrink-0 mt-0.5 text-slate-300 hover:text-slate-600 transition-colors" aria-label="Dismiss">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  const { data: allConnections = [] } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list() as Promise<Connection[]>,
  })
  const connectionIds = allConnections.map((c) => c.id)

  const { data: allAlerts = [] } = useQuery({
    queryKey: ["all-alerts"],
    queryFn: async () => {
      const results = await Promise.all(connectionIds.map((id) => alertsApi.unread(id)))
      return results.flat()
    },
    enabled: connectionIds.length > 0,
    refetchInterval: 60_000,
  })

  const highPriorityCount = allAlerts.filter((a) => a.priority === "high" && !a.is_read).length

  const ackMutation = useMutation({
    mutationFn: (alertId: string) => alertsApi.acknowledge(alertId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-alerts"] }),
  })

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(connectionIds.map((id) => alertsApi.markAllRead(id)))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["all-alerts"] }),
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const connectionMap = Object.fromEntries(allConnections.map((c) => [c.id, c.name]))
  const sorted = [...allAlerts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="relative" ref={panelRef}>
      <button onClick={() => setOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors" aria-label="Notifications">
        <Bell className="w-5 h-5" />
        {highPriorityCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {highPriorityCount > 9 ? "9+" : highPriorityCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[80vh] bg-white rounded-xl border border-slate-200 shadow-xl flex flex-col z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Notifications</h3>
            <div className="flex items-center gap-2">
              {allAlerts.length > 0 && (
                <button onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending} className="text-xs text-violet-600 hover:text-violet-800 font-medium disabled:opacity-50">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {sorted.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No notifications</p>
                <p className="text-xs text-slate-400 mt-1">You will be notified if anything needs attention.</p>
              </div>
            ) : (
              sorted.map((alert) => (
                <AlertRow key={alert.id} alert={alert} onAck={(id) => ackMutation.mutate(id)} connectionName={connectionMap[alert.connection_id]} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
