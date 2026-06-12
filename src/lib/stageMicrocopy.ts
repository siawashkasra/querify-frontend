// U7 — the stage microcopy map. Real stage events carry terse engine tokens
// (routing / spec / execute …); we translate them to plain, calm language. The
// stage line never shows a raw token and never invents a step.

const STAGE_MAP: { match: RegExp; copy: (conn?: string) => string }[] = [
  { match: /rout|understand|read|classif/i, copy: () => "Reading the question…" },
  { match: /spec|measure|verif|model/i, copy: () => "Matching verified measures…" },
  { match: /sql|execut|query|run/i, copy: (conn) => `Querying ${conn || "your database"}…` },
  { match: /analy|summar|narrat|writ/i, copy: () => "Writing the analysis…" },
  { match: /chart|visual|plot/i, copy: () => "Drawing the chart…" },
  { match: /plan|decompos|expand/i, copy: () => "Planning the analysis…" },
]

/**
 * Translate a raw stage string into curated microcopy. Falls back to the raw
 * text when it already reads like a sentence, else a calm default.
 */
export function stageMicrocopy(raw: string | null | undefined, connectionName?: string): string {
  const s = (raw ?? "").trim()
  if (!s) return "Working…"
  for (const { match, copy } of STAGE_MAP) {
    if (match.test(s)) return copy(connectionName)
  }
  // Already a human sentence (has a space and ends mid-thought) — keep it.
  if (/\s/.test(s)) return s
  return "Working…"
}

export default stageMicrocopy
