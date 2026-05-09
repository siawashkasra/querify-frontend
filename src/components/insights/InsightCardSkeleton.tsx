"use client"

import { cn } from "@/lib/cn"

export function InsightCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex flex-col min-h-[320px]",
        className
      )}
    >
      <div className="h-2 shimmer w-full rounded-none" aria-hidden />
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="h-6 w-20 rounded-full shimmer" />
          <div className="flex items-center gap-2">
            <div className="h-6 w-16 rounded-full shimmer" />
            <div className="h-3 w-12 rounded shimmer" />
          </div>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4 space-y-2 bg-[var(--surface-2)]">
          <div className="h-9 w-32 rounded shimmer" />
          <div className="h-6 w-24 rounded-full shimmer" />
          <div className="h-3 w-28 rounded shimmer" />
        </div>
        <div className="h-[100px] w-full rounded-lg shimmer shrink-0" />
        <div className="h-11 w-full rounded shimmer" />
        <div className="mt-auto flex justify-between pt-2">
          <div className="h-3 w-20 rounded shimmer" />
          <div className="h-8 w-40 rounded-md shimmer" />
        </div>
      </div>
    </div>
  )
}
