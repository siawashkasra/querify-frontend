import { describe, it, expect, beforeEach } from "vitest"
import { useChatStore } from "@/store/chatStore"
import type { AnswerCell, AnswerCellKind } from "@/types"

// Z5 — the v2 document reducers, tested against the REAL store. Guards the
// frontend failure modes: a chart cell the backend synthesised for a ranking
// must survive reduction AND rehydration (never dropped), REFINE replaces a cell
// in place, and doc-done attaches follow-ups.

const S = "sess-1"
const TEMP = "tmp-1"
const SEC = "sec-1"

function cell(id: string, kind: AnswerCellKind, extra: Partial<AnswerCell> = {}): AnswerCell {
  return { id, name: id, kind, title: kind, status: "complete", section_id: SEC, ...extra } as AnswerCell
}

function doc() {
  const m = useChatStore.getState().threads[S]?.find((x) => x.id === TEMP)
  return m?.document
}

beforeEach(() => {
  // fresh streaming assistant message with no document yet
  useChatStore.setState({
    threads: { [S]: [{ id: TEMP, role: "assistant" } as never] },
    agentFeeds: {},
  })
})

describe("chatStore v2 reducers", () => {
  it("section_start creates an empty section on the message document", () => {
    useChatStore.getState().v2SectionStart(S, TEMP, SEC, "top 5 products by revenue")
    const d = doc()
    expect(d?.sections).toHaveLength(1)
    expect(d?.sections[0]).toMatchObject({ id: SEC, question: "top 5 products by revenue", cells: [] })
  })

  it("chart-presence: a ranking's chart cell is kept in the reduced document", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "top 5 products by revenue")
    st.v2CellComplete(S, TEMP, cell("c-table", "table"))
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart"))
    const kinds = doc()?.sections[0].cells.map((c) => c.kind)
    expect(kinds).toContain("chart")             // the chart cell survives — never dropped
    expect(kinds).toContain("table")
  })

  it("cell_complete is idempotent — same id replaces, never duplicates", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "q")
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { title: "v1" }))
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { title: "v2" }))
    const cells = doc()?.sections[0].cells ?? []
    expect(cells.filter((c) => c.id === "c-chart")).toHaveLength(1)
    expect(cells[0].title).toBe("v2")
  })

  it("rehydration parity: the document round-trips through JSON unchanged", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "top products")
    st.v2CellComplete(S, TEMP, cell("c-table", "table"))
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart"))
    st.v2DocDone(S, TEMP, SEC, ["Break Revenue down by Customer"], "Done.")
    const before = doc()
    const rehydrated = JSON.parse(JSON.stringify(before))
    expect(rehydrated).toEqual(before)                       // parity
    expect(rehydrated.sections[0].cells.map((c: AnswerCell) => c.kind)).toContain("chart")
  })

  it("cell_update (REFINE) replaces a cell by id in place", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "q")
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { title: "old" }))
    st.v2CellUpdate(S, TEMP, cell("c-chart", "chart", { title: "refined" }))
    const cells = doc()?.sections[0].cells ?? []
    expect(cells).toHaveLength(1)
    expect(cells[0].title).toBe("refined")
  })

  it("doc_done attaches follow-ups and completion text", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "q")
    st.v2DocDone(S, TEMP, SEC, ["Revenue by month"], "Finished.")
    expect(doc()?.follow_ups).toEqual(["Revenue by month"])
    expect(doc()?.completion_text).toBe("Finished.")
  })
})
