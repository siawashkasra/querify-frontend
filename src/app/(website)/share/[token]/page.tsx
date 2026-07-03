"use client"

// W6 — the public, read-only share page. Fetches the sanitized document by token
// (no auth, no bearer), renders the same answer read-only with the verification
// footer. No composer, no panel; the SQL and credentials were stripped server-side.

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

interface Cell { id: string; kind: string; payload: Record<string, unknown> }
interface Section { id: string; question?: string; title?: string; cells: Cell[] }
interface Payload { document: { sections: Section[]; completion_text?: string }; connection_name?: string }

function MetricCell({ payload }: { payload: Record<string, unknown> }) {
  const value = (payload.formatted as string) ?? String(payload.value ?? "")
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-slate-500">{(payload.label as string) ?? ""}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  )
}

function TableCell({ payload }: { payload: Record<string, unknown> }) {
  const cols = (payload.columns as string[]) ?? []
  const rows = (payload.rows as unknown[][]) ?? []
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-slate-50">{cols.map((c) => <th key={c} className="p-2 text-left">{c}</th>)}</tr></thead>
        <tbody>{rows.slice(0, 50).map((r, i) => (
          <tr key={i} className="border-b">{r.map((v, j) => <td key={j} className="p-2">{String(v)}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  )
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API}/api/v1/share/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(setData)
      .catch(() => setError("This shared analysis is no longer available."))
  }, [token])

  if (error) return <div className="mx-auto max-w-2xl p-16 text-center text-slate-500">{error}</div>
  if (!data) return <div className="mx-auto max-w-2xl p-16 text-center text-slate-400">Loading…</div>

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between border-b pb-4">
        <span className="text-lg font-bold text-violet-600">QUERIFY</span>
        <span className="text-sm text-slate-500">
          Shared from Querify{data.connection_name ? ` · ${data.connection_name}` : ""}
        </span>
      </header>

      {data.document.sections.map((s) => (
        <section key={s.id} className="space-y-3">
          {s.question && <h2 className="text-lg font-semibold">{s.question}</h2>}
          <div className="grid gap-3">
            {s.cells.map((c) => {
              if (c.kind === "metrics") return <MetricCell key={c.id} payload={c.payload} />
              if (c.kind === "table") return <TableCell key={c.id} payload={c.payload} />
              if (c.kind === "narrative" || c.kind === "title")
                return <p key={c.id} className="text-slate-700">{String(c.payload.text ?? c.payload.value ?? "")}</p>
              return null
            })}
          </div>
        </section>
      ))}

      {data.document.completion_text && (
        <p className="text-slate-600">{data.document.completion_text}</p>
      )}

      <footer className="flex items-center gap-2 border-t pt-4 text-xs text-slate-400">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Verified against the source database.
      </footer>
    </div>
  )
}
