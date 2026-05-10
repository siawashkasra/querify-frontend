"use client"

import * as Dialog from "@radix-ui/react-dialog"
import { X, Plus, Minus, ArrowRight, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/cn"
import Spinner from "@/components/ui/Spinner"
import type { SchemaDiff, TypeChange } from "@/types"

interface SchemaChangeModalProps {
  connectionId: string
  diff: SchemaDiff
  onClose: () => void
  onAcknowledge: (refreshContext: boolean) => void
  isPending: boolean
}

export function SchemaChangeModal({ diff, onClose, onAcknowledge, isPending }: SchemaChangeModalProps) {
  const hasAdded = diff.tables_added.length > 0 || Object.keys(diff.columns_added).length > 0
  const hasRemoved = diff.tables_removed.length > 0 || Object.keys(diff.columns_removed).length > 0
  const hasModified = Object.keys(diff.type_changes).length > 0
  const isBreaking = diff.severity === "breaking"

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={cn(
          "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
          "w-full max-w-lg rounded-xl border bg-white shadow-xl p-6",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] duration-200",
          isBreaking ? "border-red-300" : "border-[var(--border)]"
        )}>
          <Dialog.Close className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] transition-colors">
            <X size={16} />
          </Dialog.Close>

          <Dialog.Title className="text-base font-semibold text-[var(--text)] mb-1">
            Schema changes detected
          </Dialog.Title>
          <Dialog.Description className="text-sm text-[var(--text-dim)] mb-4">{diff.summary}</Dialog.Description>

          <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
            {hasAdded && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                    <Plus size={10} /> Added
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {diff.tables_added.map((t) => (
                    <li key={t} className="text-sm text-[var(--text)] flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                      Table: <span className="font-mono font-medium">{t}</span>
                    </li>
                  ))}
                  {Object.entries(diff.columns_added).map(([tbl, cols]) =>
                    cols.map((col) => (
                      <li key={`${tbl}.${col}`} className="text-sm text-[var(--text)] flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                        <span className="font-mono font-medium">{tbl}.{col}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            )}

            {hasRemoved && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                    <Minus size={10} /> Removed
                  </span>
                  {isBreaking && (
                    <span className="inline-flex items-center gap-1 text-xs text-red-600">
                      <AlertTriangle size={11} /> May affect your metrics
                    </span>
                  )}
                </div>
                <ul className="flex flex-col gap-1">
                  {diff.tables_removed.map((t) => (
                    <li key={t} className="text-sm text-red-700 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                      Table: <span className="font-mono font-medium">{t}</span>
                    </li>
                  ))}
                  {Object.entries(diff.columns_removed).map(([tbl, cols]) =>
                    cols.map((col) => (
                      <li key={`${tbl}.${col}`} className="text-sm text-red-700 flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="font-mono font-medium">{tbl}.{col}</span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            )}

            {hasModified && (
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                    Modified
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {Object.values(diff.type_changes).flat().map((tc: TypeChange) => (
                    <li key={`${tc.table}.${tc.column}`} className="text-sm text-[var(--text)] flex items-center gap-1.5 flex-wrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="font-mono font-medium">{tc.table}.{tc.column}</span>
                      <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                        <span className="font-mono">{tc.old_type}</span>
                        <ArrowRight size={10} />
                        <span className="font-mono">{tc.new_type}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-4">
            <button
              onClick={() => onAcknowledge(false)}
              disabled={isPending || isBreaking}
              className="px-4 py-2 rounded-lg text-sm text-[var(--text-dim)] hover:bg-[var(--surface-3)] disabled:opacity-40 transition-colors"
            >
              Acknowledge only
            </button>
            <button
              onClick={() => onAcknowledge(true)}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? <Spinner size="sm" /> : null}
              Refresh context
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default SchemaChangeModal
