"use client"

// W4 — the Glossary. The user's vocabulary made visible + editable: synonyms
// ('we call revenue GMV'), and the fiscal-year setting. Definitions that change
// math show their verification state (pending until the engine confirms them).

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { BookOpen, Plus, Trash2 } from "lucide-react"
import { glossary as glossaryApi, connections as connectionsApi } from "@/lib/api"
import type { GlossaryEntry } from "@/lib/api"
import type { Connection } from "@/types"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

export default function GlossaryPage() {
  const qc = useQueryClient()
  const { data: conns } = useQuery<Connection[]>({
    queryKey: ["connections"],
    queryFn: () => connectionsApi.list(),
    staleTime: 60_000,
  })
  const [connId, setConnId] = useState<string | null>(null)
  const activeConn = connId ?? conns?.[0]?.id ?? null

  const { data: entries, isLoading } = useQuery<GlossaryEntry[]>({
    queryKey: ["glossary", activeConn],
    queryFn: () => glossaryApi.list(activeConn as string),
    enabled: !!activeConn,
  })

  const [term, setTerm] = useState("")
  const [mapsTo, setMapsTo] = useState("")

  const { mutate: add, isPending } = useMutation({
    mutationFn: () =>
      glossaryApi.add(activeConn as string, { kind: "synonym", term: term.trim(), maps_to: mapsTo.trim() }),
    onSuccess: () => {
      toast.success("Added to your glossary")
      setTerm(""); setMapsTo("")
      qc.invalidateQueries({ queryKey: ["glossary", activeConn] })
    },
    onError: () => toast.error("Could not add the term."),
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => glossaryApi.remove(activeConn as string, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["glossary", activeConn] }),
  })

  return (
    <div className="max-w-2xl space-y-6">
      <header className="flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Glossary</h1>
      </header>
      <p className="text-sm text-muted-foreground">
        Teach Querify your vocabulary. A synonym like “GMV → Revenue” is understood
        in every future question and echoed back in your terms.
      </p>

      {conns && conns.length > 1 && (
        <select
          className="rounded border px-2 py-1 text-sm"
          value={activeConn ?? ""}
          onChange={(e) => setConnId(e.target.value)}
        >
          {conns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Your term</label>
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="GMV" />
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Means</label>
          <Input value={mapsTo} onChange={(e) => setMapsTo(e.target.value)} placeholder="Revenue" />
        </div>
        <Button onClick={() => add()} disabled={!activeConn || !term.trim() || !mapsTo.trim() || isPending}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      <div className="divide-y rounded border">
        {isLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && (!entries || entries.length === 0) && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No terms yet — try renaming a measure to teach Querify your vocabulary.
          </div>
        )}
        {entries?.map((e) => (
          <div key={e.id} className="flex items-center justify-between p-3 text-sm">
            <div>
              <span className="font-medium">{e.term}</span>
              <span className="mx-2 text-muted-foreground">→</span>
              <span>{e.maps_to}</span>
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">{e.source}</span>
              {e.status === "pending_verification" && (
                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">pending verification</span>
              )}
            </div>
            <button onClick={() => remove(e.id)} className="text-muted-foreground hover:text-red-600" aria-label="Delete">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
