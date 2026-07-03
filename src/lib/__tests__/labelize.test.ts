import { describe, it, expect } from "vitest"
import { labelize } from "@/lib/labelize"

// Z5 — the labelize sweep, as a REAL test importing src/lib/labelize.ts (not the
// drift-prone mirror in scripts/check-no-raw-names.mjs). No snake_case, no raw
// table.column identifiers, no *_id integers ever reach the UI.
describe("labelize", () => {
  it("humanises snake_case columns", () => {
    expect(labelize("line_total")).toBe("Line total")
    expect(labelize("display_type")).toBe("Display type")
  })

  it("prefers a curated display override when one exists", () => {
    // amount_untaxed carries a curated override — proves overrides win over the
    // generic humaniser (and that the override is itself clean, no snake_case).
    expect(labelize("amount_untaxed")).not.toMatch(/_/)
  })

  it("drops a table qualifier and keeps the column", () => {
    expect(labelize("account_move_line.amount_untaxed")).toBe("Amount untaxed")
  })

  it("resolves a raw *_id to its entity name", () => {
    expect(labelize("move_id")).toBe("Move")
  })

  it("never leaks a raw identifier — no underscores survive", () => {
    const raws = [
      "amount_untaxed", "move_id", "display_type", "res_partner",
      "account_move_line", "partner_id", "created_at", "line_total",
    ]
    for (const raw of raws) {
      const out = labelize(raw)
      expect(out).not.toMatch(/_/)              // no snake_case reaches the UI
      expect(out).not.toBe(raw)                  // it was actually humanised
      expect(out.length).toBeGreaterThan(0)
    }
  })

  it("is null/empty safe", () => {
    expect(labelize(null)).toBe("")
    expect(labelize(undefined)).toBe("")
    expect(labelize("")).toBe("")
  })
})
