// U1 — the trust underline helper. Every data number in the product carries a
// visible trust state encoded as an underline (see globals.css .num-* utilities):
//   solid violet  → the answer came from the verified semantic model
//   dashed amber  → the answer came from generated SQL (honest fallback)
//   none          → decorative / non-load-bearing number
//
// numClass() reads the answer's routing/verification metadata and returns the
// right class so callers never hand-pick the underline. Pass either the routing
// path string ("spec" | "llm_sql" | ...) or a cell-meta object that carries it.

export type NumTrust = "verified" | "fallback" | "plain"

/** Routing paths the verified semantic model produces. Anything else that still
 *  reflects real data is treated as the generated-SQL fallback. */
const VERIFIED_PATHS = new Set(["spec", "verified", "model", "semantic_model"])

/** Cell/answer metadata we can read a trust state from. All fields optional —
 *  we degrade gracefully to "plain" when nothing trustworthy is present. */
export interface CellTrustMeta {
  routingPath?: string | null
  routing_path?: string | null
  verifiedOnly?: boolean | null
  verified_only?: boolean | null
  verified?: boolean | null
  isVerified?: boolean | null
  /** Set true for decorative numbers (counts in chrome, page indices, etc.). */
  decorative?: boolean | null
  trust?: NumTrust | null
}

function trustFromPath(path: string | null | undefined): NumTrust {
  if (!path) return "fallback"
  return VERIFIED_PATHS.has(path.trim().toLowerCase()) ? "verified" : "fallback"
}

/** Resolve the trust state from a routing-path string or a cell-meta object. */
export function numTrust(input: string | CellTrustMeta | null | undefined): NumTrust {
  if (input == null) return "plain"

  if (typeof input === "string") return trustFromPath(input)

  if (input.decorative) return "plain"
  if (input.trust) return input.trust

  const path = input.routingPath ?? input.routing_path
  if (path != null) return trustFromPath(path)

  const verified =
    input.verified ?? input.isVerified ?? input.verifiedOnly ?? input.verified_only
  if (verified === true) return "verified"
  if (verified === false) return "fallback"

  return "plain"
}

const CLASS_BY_TRUST: Record<NumTrust, string> = {
  verified: "num-verified",
  fallback: "num-fallback",
  plain: "num-plain",
}

/**
 * Pick the trust-underline class for a data number.
 * @example className={numClass(answer.routingPath)}
 * @example className={numClass({ verified: cell.verifiedOnly })}
 */
export function numClass(input: string | CellTrustMeta | null | undefined): string {
  return CLASS_BY_TRUST[numTrust(input)]
}
