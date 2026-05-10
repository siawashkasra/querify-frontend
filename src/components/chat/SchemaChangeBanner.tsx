"use client"

import { useState } from "react"
import { AlertTriangle, Info, X, RefreshCw } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { connections as connectionsApi } from "@/lib/api"
import { cn } from "@/lib/cn"
import Spinner from "@/components/ui/Spinner"
import type { SchemaDiff } from "@/types"
import { SchemaChangeModal } from "./SchemaChangeModal"

interface SchemaChangeBannerProps {
  connectionId: string
  diff: SchemaDiff
}

const SEVERITY_CONFIG = {
  minor: {
    bannerClass: "bg-blue-50 border-blue-200 text-blue-800",
    iconClass: "text-blue-500",
    Icon: Info,
    title: "Your database schema has changed.",
    canDismiss: true,
  },
  significant: {
    bannerClass: "bg-amber-50 border-amber-200 text-amber-800",
    iconClass: "text-amber-500",
    Icon: AlertTriangle,
    title: "Your database schema has changed. Some queries may be affected.",
    canDismiss: true,
  },
  breaking: {
    bannerClass: "bg-red-50 border-red-200 text-red-800",
    iconClass: "text-red-500",
    Icon: AlertTriangle,
    title: "Schema change may break your metrics.",
    canDismiss: false,
  },
}

export function SchemaChangeBanner({ connectionId, diff }: SchemaChangeBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const qc = useQueryClient()
  const cfg = SEVERITY_CONFIG[diff.severity] ?? SEVERITY_CONFIG.minor

  const acknowledgeMutation = useMutation({
    mutationFn: (refreshContext: boolean) => connectionsApi.acknowledgeSchemaChange(connectionId, refreshContext),
    onSuccess: (_, refreshContext) => {
      qc.invalidateQueries({ queryKey: ["connections"] })
      qc.invalidateQueries({ queryKey: ["connection", connectionId] })
      setDismissed(true)
      if (refreshContext) toast.success("Context refresh queued.")
      else toast.success("Schema change acknowledged.")
    },
    onError: () => toast.error("Could not acknowledge schema change."),
  })

  if (dismissed) return null

  const affectedMetrics = _extractAffectedMetrics(diff)

  return (
    <>
      <div className={cn("flex items-start gap-3 px-4 py-3 border rounded-lg mx-4 mt-3 text-sm", cfg.bannerClass)}>
        <cfg.Icon size={15} className={cn("shrink-0 mt-0.5", cfg.iconClass)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{cfg.title}</p>
          {diff.severity === "breaking" && affectedMetrics.length > 0 && (
            <p className="mt-0.5 text-xs opacity-80">
              The following metrics may no longer work: <span className="font-semibold">{affectedMetrics.join(", ")}</span>
            </p>
          )}
          {diff.severity !== "breaking" && diff.summary && (
            <p className="mt-0.5 text-xs opacity-80">{diff.summary}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              onClick={() => acknowledgeMutation.mutate(true)}
              disabled={acknowledgeMutation.isPending}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors",
                diff.severity === "breaking"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-current/10 hover:bg-current/20"
              )}
            >
              {acknowledgeMutation.isPending ? <Spinner size="sm" /> : <RefreshCw size={11} />}
              {diff.severity === "breaking" ? "Refresh context now" : "Refresh context"}
            </button>
            <button onClick={() => setModalOpen(true)} className="px-3 py-1 rounded text-xs font-medium opacity-70 hover:opacity-100 transition-opacity underline underline-offset-2">
              See what changed
            </button>
            {cfg.canDismiss && (
              <button
                onClick={() => acknowledgeMutation.mutate(false)}
                disabled={acknowledgeMutation.isPending}
                className="ml-auto px-2 py-1 rounded text-xs opacity-60 hover:opacity-100 transition-opacity"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        {cfg.canDismiss && (
          <button onClick={() => acknowledgeMutation.mutate(false)} className="shrink-0 p-0.5 rounded hover:bg-current/10 transition-colors opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X size={13} />
          </button>
        )}
      </div>

      {modalOpen && (
        <SchemaChangeModal
          connectionId={connectionId}
          diff={diff}
          onClose={() => setModalOpen(false)}
          onAcknowledge={(refresh) => acknowledgeMutation.mutate(refresh)}
          isPending={acknowledgeMutation.isPending}
        />
      )}
    </>
  )
}

function _extractAffectedMetrics(diff: SchemaDiff): string[] {
  const names: string[] = []
  for (const cols of Object.values(diff.columns_removed)) {
    if (cols.length) names.push(...cols.slice(0, 2))
  }
  return names.slice(0, 4)
}

export default SchemaChangeBanner
