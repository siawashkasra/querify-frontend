"use client"

import { useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, AlertTriangle } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { connections as connectionsApi } from "@/lib/api"
import { useAppStore } from "@/store/appStore"
import { cn } from "@/lib/cn"
import Spinner from "@/components/ui/Spinner"
import type { Connection } from "@/types"

interface DeleteConfirmModalProps {
  connection: Connection | null
  onClose: () => void
}

export const DeleteConfirmModal = ({ connection, onClose }: DeleteConfirmModalProps) => {
  const router = useRouter()
  const qc = useQueryClient()
  const { activeConnectionId, setActiveConnection } = useAppStore()
  const [typed, setTyped] = useState("")

  const deleteMutation = useMutation({
    mutationFn: () => connectionsApi.delete(connection!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["connections"] })
      toast.success(`"${connection!.name}" deleted`)
      if (activeConnectionId === connection!.id) {
        setActiveConnection(null)
        router.push("/dashboard")
      }
      onClose()
    },
    onError: () => toast.error("Could not delete connection"),
  })

  const confirmed = typed === connection?.name

  return (
    <Dialog.Root open={!!connection} onOpenChange={(open) => { if (!open) { setTyped(""); onClose() } }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-md rounded-xl border border-danger/40 bg-white shadow-xl p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200"
        )}>
          <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors">
            <X size={16} />
          </Dialog.Close>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-full bg-danger/10 shrink-0">
                <AlertTriangle size={18} className="text-danger" />
              </div>
              <Dialog.Title className="text-base font-semibold text-[var(--text)]">
                Delete &ldquo;{connection?.name}&rdquo;?
              </Dialog.Title>
            </div>

            <Dialog.Description className="text-sm text-[var(--text-dim)] leading-relaxed">
              This will delete all chat sessions and query history associated with this connection.{" "}
              <strong className="text-[var(--text)]">This cannot be undone.</strong>
            </Dialog.Description>

            <div className="rounded-lg bg-danger/5 border border-danger/20 px-3 py-2.5">
              <p className="text-xs text-[var(--text-muted)] mb-1.5">
                Type <span className="font-mono font-semibold text-[var(--text)]">{connection?.name}</span> to confirm
              </p>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={connection?.name}
                className="w-full h-9 px-3 rounded border border-[var(--border)] bg-white text-sm outline-none focus:border-danger text-[var(--text)] placeholder:text-[var(--text-muted)]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setTyped(""); onClose() }} className="px-4 py-2 rounded-lg text-sm text-[var(--text-dim)] hover:bg-[var(--surface-3)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={!confirmed || deleteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-danger text-white text-sm font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? <><Spinner size="sm" /> Deleting…</> : "Delete permanently"}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default DeleteConfirmModal
