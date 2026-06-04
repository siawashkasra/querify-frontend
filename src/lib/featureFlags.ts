// Feature flags read from NEXT_PUBLIC_* env (inlined at build time).
//
// Insights page is hidden for now — folded into the dashboard. Set
// NEXT_PUBLIC_INSIGHTS_ENABLED=true to restore the standalone page, its nav
// item, badge and links. Defaults to false (hidden) when unset.
export const INSIGHTS_ENABLED = process.env.NEXT_PUBLIC_INSIGHTS_ENABLED === "true"
