import { useQuery } from "@tanstack/react-query"
import { billing as billingApi } from "@/lib/api"
import type { SubscriptionInfo, UsageSummary } from "@/lib/api"

export interface PlanState {
  planName: string
  status: string
  queryLimit: number | null
  queriesUsed: number
  connectionLimit: number | null
  seatLimit: number | null
  isFreePlan: boolean
  canExport: boolean
  canInsights: boolean
  canApiAccess: boolean
  daysRemaining: number
  periodEnd: string | null
  isLoading: boolean
}

export function usePlan(): PlanState {
  const { data: sub, isLoading: subLoading } = useQuery<SubscriptionInfo>({
    queryKey: ["billing-subscription"],
    queryFn: () => billingApi.subscription() as Promise<SubscriptionInfo>,
    staleTime: 5 * 60_000,
  })

  const { data: usage, isLoading: usageLoading } = useQuery<UsageSummary>({
    queryKey: ["billing-usage"],
    queryFn: () => billingApi.usage() as Promise<UsageSummary>,
    staleTime: 60_000,
  })

  const planName = sub?.plan_name ?? "free"
  const isFreePlan = planName === "free"

  return {
    planName,
    status: sub?.status ?? "active",
    queryLimit: usage?.query_limit ?? 20,
    queriesUsed: usage?.queries_used ?? 0,
    connectionLimit: usage?.connection_limit ?? 1,
    seatLimit: usage?.seat_limit ?? 1,
    isFreePlan,
    canExport: !isFreePlan,
    canInsights: !isFreePlan,
    canApiAccess: planName === "pro" || planName === "team",
    daysRemaining: usage?.days_remaining ?? 30,
    periodEnd: usage?.period_end ?? sub?.current_period_end ?? null,
    isLoading: subLoading || usageLoading,
  }
}
