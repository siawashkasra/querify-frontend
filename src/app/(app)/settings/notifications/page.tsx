"use client"

// W5 — Notifications: the scheduled briefing subscription + user-defined alert
// rules on verified measures. The product initiates contact; every alert is
// truth-gated before it fires.

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "react-hot-toast"
import { Bell, Mail, Plus, Trash2 } from "lucide-react"
import { notifications as notifApi, connections as connectionsApi } from "@/lib/api"
import type { AlertRule, BriefingSubscription, Connection } from "@/lib/api"
import Button from "@/components/ui/Button"
import Input from "@/components/ui/Input"

export default function NotificationsPage() {
  const qc = useQueryClient()
  const { data: conns } = useQuery<Connection[]>({
    queryKey: ["connections"], queryFn: () => connectionsApi.list(), staleTime: 60_000,
  })
  const connId = conns?.[0]?.id ?? null

  const { data: sub } = useQuery<BriefingSubscription>({
    queryKey: ["briefing-sub", connId],
    queryFn: () => notifApi.getBriefing(connId as string),
    enabled: !!connId,
  })
  const { data: rules } = useQuery<AlertRule[]>({
    queryKey: ["alert-rules", connId],
    queryFn: () => notifApi.listRules(connId as string),
    enabled: !!connId,
  })

  const { mutate: toggleBriefing } = useMutation({
    mutationFn: (enabled: boolean) =>
      notifApi.setBriefing(connId as string, { cadence: "daily", hour: 8, timezone: "UTC", enabled }),
    onSuccess: () => { toast.success("Briefing updated"); qc.invalidateQueries({ queryKey: ["briefing-sub", connId] }) },
  })

  const [measure, setMeasure] = useState("")
  const [pct, setPct] = useState("10")
  const { mutate: addRule } = useMutation({
    mutationFn: () => notifApi.createRule(connId as string, {
      measure: measure.trim(),
      condition: { basis: "change", op: "<=", value: -Math.abs(Number(pct)), change_basis: "wow" },
      cadence: "daily",
    }),
    onSuccess: () => { toast.success("Alert created"); setMeasure(""); qc.invalidateQueries({ queryKey: ["alert-rules", connId] }) },
    onError: () => toast.error("Could not create the alert (is it a verified measure?)"),
  })
  const { mutate: removeRule } = useMutation({
    mutationFn: (id: string) => notifApi.deleteRule(connId as string, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alert-rules", connId] }),
  })

  return (
    <div className="max-w-2xl space-y-8">
      <header className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Notifications</h1>
      </header>

      <section className="space-y-2">
        <div className="flex items-center justify-between rounded border p-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium">Daily briefing email</p>
              <p className="text-sm text-muted-foreground">Your verified KPIs, delivered every morning.</p>
            </div>
          </div>
          <input type="checkbox" checked={!!sub?.enabled}
                 onChange={(e) => toggleBriefing(e.target.checked)} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">Alert rules</h2>
        <p className="text-sm text-muted-foreground">Alert me when a measure drops week-over-week. Every alert is verified before it fires.</p>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Measure</label>
            <Input value={measure} onChange={(e) => setMeasure(e.target.value)} placeholder="Revenue" />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground">Drops % WoW</label>
            <Input value={pct} onChange={(e) => setPct(e.target.value)} />
          </div>
          <Button onClick={() => addRule()} disabled={!connId || !measure.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <div className="divide-y rounded border">
          {(!rules || rules.length === 0) && (
            <div className="p-6 text-center text-sm text-muted-foreground">No alerts yet.</div>
          )}
          {rules?.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3 text-sm">
              <span>Alert when <b>{r.measure}</b> {r.condition.change_basis?.toUpperCase()} ≤ {r.condition.value}%</span>
              <button onClick={() => removeRule(r.id)} className="text-muted-foreground hover:text-red-600" aria-label="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
