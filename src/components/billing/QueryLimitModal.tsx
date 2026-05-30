"use client"

import { useEffect, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { X, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/cn"

interface QueryLimitDetail {
  queries_used?: number
  query_limit?: number
  plan?: string
  upgrade_url?: string
  period_end?: string
}

interface QueryLimitModalProps {
  /** Controlled: when true, the modal is shown. */
  open?: boolean
  onClose?: () => void
}

/**
 * Shown when the API returns 429 with error='query_limit_exceeded'.
 *
 * Mount this once near the top of the app tree. It listens for the
 * `querify:query_limit_exceeded` custom DOM event emitted by the Axios
 * interceptor in lib/api.ts, so it self-opens without prop drilling.
 *
 * Also accepts controlled `open` / `onClose` props for direct usage.
 */
export function QueryLimitModal({ open: controlledOpen, onClose }: QueryLimitModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(controlledOpen ?? false)
  const [detail, setDetail] = useState<QueryLimitDetail>({})

  useEffect(() => {
    if (controlledOpen !== undefined) setOpen(controlledOpen)
  }, [controlledOpen])

  useEffect(() => {
    function handleEvent(e: Event) {
      const custom = e as CustomEvent<QueryLimitDetail>
      setDetail(custom.detail ?? {})
      setOpen(true)
    }
    window.addEventListener("querify:query_limit_exceeded", handleEvent)
    return () => window.removeEventListener("querify:query_limit_exceeded", handleEvent)
  }, [])

  function handleClose() {
    setOpen(false)
    onClose?.()
  }

  const planName = detail.plan ?? "free"
  const used = detail.queries_used ?? 0
  const limit = detail.query_limit ?? 0
  const periodEndLabel = detail.period_end
    ? new Date(detail.period_end).toLocaleDateString(undefined, { month: "long", day: "numeric" })
    : "next period"

  const NEXT_PLAN: Record<string, { name: string; benefit: string }> = {
    free:    { name: "Starter", benefit: "300 queries/month and 2 connections" },
    starter: { name: "Pro",     benefit: "unlimited queries and connections" },
    pro:     { name: "Team",    benefit: "unlimited everything and more seats" },
  }
  const next = NEXT_PLAN[planName] ?? { name: "a paid plan", benefit: "more queries" }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md rounded-xl border border-amber-200 bg-white shadow-xl p-6",
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
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Zap size={18} className="text-amber-500" />
            </div>
            <Dialog.Title className="text-base font-semibold text-[var(--text)]">
              Monthly query limit reached
            </Dialog.Title>
          </div>

          {/* Body */}
          <p className="text-sm text-[var(--text-muted)] mb-1">
            You have used all <strong>{limit}</strong> queries for this month.
          </p>
          <p className="text-sm text-[var(--text-muted)] mb-5">
            Upgrade to <strong>{next.name}</strong> for {next.benefit}.
          </p>

          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
              <span>{used} used</span>
              <span>{limit} limit</span>
            </div>
            <div className="h-2 rounded-full bg-[var(--surface-3)] overflow-hidden">
              <div className="h-full rounded-full bg-amber-400" style={{ width: "100%" }} />
            </div>
          </div>

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

          <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
            Resets on {periodEndLabel}
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
