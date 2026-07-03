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
  return { id, name: id, kind, status: "complete", section_id: SEC, order: 0, ...extra } as AnswerCell
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
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { name: "v1" }))
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { name: "v2" }))
    const cells = doc()?.sections[0].cells ?? []
    expect(cells.filter((c) => c.id === "c-chart")).toHaveLength(1)
    expect(cells[0].name).toBe("v2")
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
    st.v2CellComplete(S, TEMP, cell("c-chart", "chart", { name: "old" }))
    st.v2CellUpdate(S, TEMP, cell("c-chart", "chart", { name: "refined" }))
    const cells = doc()?.sections[0].cells ?? []
    expect(cells).toHaveLength(1)
    expect(cells[0].name).toBe("refined")
  })

  it("out-of-order: a cell_complete before its section_start is not dropped", () => {
    const st = useChatStore.getState()
    // cell arrives BEFORE the section — the section is created on the fly
    st.v2CellComplete(S, TEMP, cell("c-early", "chart"))
    let cells = doc()?.sections[0]?.cells ?? []
    expect(cells.map((c) => c.id)).toContain("c-early")
    // the later section_start fills in the question without dropping the cell
    st.v2SectionStart(S, TEMP, SEC, "top products")
    expect(doc()?.sections).toHaveLength(1)
    expect(doc()?.sections[0].question).toBe("top products")
    cells = doc()?.sections[0]?.cells ?? []
    expect(cells.map((c) => c.id)).toContain("c-early")
  })

  it("duplicate section_start does not create a duplicate section", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "q")
    st.v2SectionStart(S, TEMP, SEC, "q-again")
    expect(doc()?.sections).toHaveLength(1)
    expect(doc()?.sections[0].question).toBe("q")   // first question kept
  })

  it("doc_done attaches follow-ups and completion text", () => {
    const st = useChatStore.getState()
    st.v2SectionStart(S, TEMP, SEC, "q")
    st.v2DocDone(S, TEMP, SEC, ["Revenue by month"], "Finished.")
    expect(doc()?.follow_ups).toEqual(["Revenue by month"])
    expect(doc()?.completion_text).toBe("Finished.")
  })
})
