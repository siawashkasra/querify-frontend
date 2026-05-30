"use client"

import { useState } from "react"
import { AlertTriangle } from "lucide-react"
import { toast } from "react-hot-toast"
import { billing } from "@/lib/api"

interface ReactivationBannerProps {
  /** ISO date string for current_period_end */
  periodEnd: string
  /** Called after successful reactivation so the parent can refresh subscription state */
  onReactivated?: () => void
}

/**
 * Amber banner shown on the billing page when cancel_at_period_end is true.
 * The presence of subscription.cancelled_at (non-null) is used as the signal.
 *
 * Mount it at the top of the billing settings page:
 *   {subscription?.cancelled_at && (
 *     <ReactivationBanner periodEnd={subscription.current_period_end} onReactivated={refetch} />
 *   )}
 */
export function ReactivationBanner({ periodEnd, onReactivated }: ReactivationBannerProps) {
  const [loading, setLoading] = useState(false)

  const dateLabel = new Date(periodEnd).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  async function handleReactivate() {
    setLoading(true)
    try {
      await billing.reactivate()
      toast.success("Subscription reactivated. Thanks for staying!")
      onReactivated?.()
    } catch (err: unknown) {
      toast.error((err as { message?: string }).message || "Could not reactivate. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
      <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
      <p className="flex-1 text-sm text-amber-800">
        Your subscription will end on <strong>{dateLabel}</strong>. Reactivate to keep access.
      </p>
      <button
        disabled={loading}
        onClick={handleReactivate}
        className="flex-shrink-0 rounded-lg bg-amber-500 text-white text-sm font-medium px-4 py-1.5 hover:bg-amber-600 transition-colors disabled:opacity-50"
      >
        {loading ? "Reactivating…" : "Reactivate"}
      </button>
    </div>
  )
}
