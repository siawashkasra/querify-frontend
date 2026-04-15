import { track } from "@/lib/analytics"

export type PricingPlanId = "free" | "starter" | "pro" | "team"
export type BillingPeriod = "monthly" | "annual"

export function trackPlanCta(plan: PricingPlanId, billing_period: BillingPeriod) {
  track("plan_cta_clicked", { plan, billing_period })
}
