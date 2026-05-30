"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Link2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/cn"

interface ConnectionLimitDetail {
  connections_used?: number
  connection_limit?: number
  upgrade_url?: string
}

interface ConnectionLimitModalProps {
  open?: boolean
  onClose?: () => void
}

/**
 * Shown when the API returns 429 with error='connection_limit_exceeded'.
 *
 * Listens for `querify:connection_limit_exceeded` custom DOM events from
 * the Axios interceptor. Also accepts controlled open/onClose props.
 */
export function ConnectionLimitModal({ open: controlledOpen, onClose }: ConnectionLimitModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(controlledOpen ?? false)
  const [detail, setDetail] = useState<ConnectionLimitDetail>({})

  useEffect(() => {
    if (controlledOpen !== undefined) setOpen(controlledOpen)
  }, [controlledOpen])

  useEffect(() => {
    function handleEvent(e: Event) {
      const custom = e as CustomEvent<ConnectionLimitDetail>
      setDetail(custom.detail ?? {})
      setOpen(true)
    }
    window.addEventListener("querify:connection_limit_exceeded", handleEvent)
    return () => window.removeEventListener("querify:connection_limit_exceeded", handleEvent)
  }, [])

  function handleClose() {
    setOpen(false)
    onClose?.()
  }

  const limit = detail.connection_limit ?? 1
  const used = detail.connections_used ?? 0

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl border border-violet-200 bg-white shadow-xl p-6",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200",
          )}
        >
          <Dialog.Close
            className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </Dialog.Close>

          {/* Icon + heading */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center">
              <Link2 size={18} className="text-violet-500" />
            </div>
            <Dialog.Title className="text-base font-semibold text-[var(--text)]">
              Connection limit reached
            </Dialog.Title>
          </div>

          {/* Body */}
          <p className="text-sm text-[var(--text-muted)] mb-1">
            Your plan allows <strong>{limit}</strong> connection{limit === 1 ? "" : "s"}.
            You currently have <strong>{used}</strong> active.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Upgrade to <strong>Starter</strong> for 2 connections or{" "}
            <strong>Pro</strong> for unlimited.
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                handleClose()
                router.push(detail.upgrade_url ?? "/settings/billing")
              }}
              className="w-full rounded-lg bg-[var(--brand)] text-white text-sm font-medium py-2.5 px-4 hover:bg-[var(--brand-hover)] transition-colors"
            >
              Upgrade now
            </button>
            <button
              onClick={handleClose}
              className="w-full rounded-lg border border-[var(--border)] text-sm text-[var(--text-muted)] py-2.5 px-4 hover:bg-[var(--surface-2)] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
