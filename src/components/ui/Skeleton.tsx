import { InsightCardSkeleton } from "@/components/insights/InsightCardSkeleton"
import { cn } from "@/lib/cn"

interface SkeletonProps { className?: string }

export const Skeleton = ({ className }: SkeletonProps) => (
  <div className={cn("shimmer rounded-ctrl bg-line", className)} />
)

export const SkeletonCard = ({ className }: SkeletonProps) => (
  <div className={cn("rounded-card border border-line bg-surface p-4 flex flex-col gap-3", className)}>
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
  <div className={cn("flex items-center gap-3 py-3 border-b border-line", className)}>
    <Skeleton className="h-4 flex-1 max-w-xs" />
    <Skeleton className="h-5 w-16" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-7 w-20" />
  </div>
)

export const SkeletonInsightCard = ({ className }: SkeletonProps) => <InsightCardSkeleton className={className} />

export const SkeletonChart = ({ className }: SkeletonProps) => (
  <div className={cn("flex flex-col gap-2", className)}>
    <Skeleton className="h-3.5 w-32" />
    <div className="relative h-[280px] rounded-lg overflow-hidden">
      <Skeleton className="h-full w-full" />
      <div className="absolute bottom-0 inset-x-0 flex items-end justify-around gap-1 px-4 pb-0">
        {[60, 80, 45, 95, 70, 55, 85, 65].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-white/40" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  </div>
)

export default Skeleton
