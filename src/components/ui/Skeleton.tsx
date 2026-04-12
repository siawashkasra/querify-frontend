import { cn } from "@/lib/cn"

interface SkeletonProps { className?: string }

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("animate-pulse rounded bg-surface-3", className)} />
)

export const SkeletonCard = ({ className }: SkeletonProps) => (
  <div className={cn("rounded-lg border border-[var(--border)] bg-surface-2 p-4 flex flex-col gap-3", className)}>
    <div className="flex items-center gap-2.5">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex flex-col gap-1.5 flex-1">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-5 w-12" />
    </div>
    <Skeleton className="h-px w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-7 w-16" />
    </div>
  </div>
)

export const SkeletonRow = ({ className }: SkeletonProps) => (
  <div className={cn("flex items-center gap-3 py-3 border-b border-[var(--border)]", className)}>
    <Skeleton className="h-4 flex-1 max-w-xs" />
    <Skeleton className="h-5 w-16" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-7 w-20" />
  </div>
)

export const SkeletonInsightCard = ({ className }: SkeletonProps) => (
  <div className={cn("rounded-lg border border-[var(--border)] bg-surface-2 p-4 flex flex-col gap-2 min-w-[220px]", className)}>
    <Skeleton className="h-5 w-14" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-20 mt-1" />
  </div>
)

export default Skeleton
