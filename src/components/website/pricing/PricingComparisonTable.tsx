"use client"

import { Fragment } from "react"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/cn"

type Cell = string | boolean

type Row = { label: string } & Record<"free" | "starter" | "pro" | "team", Cell>

type Section = { title: string; rows: Row[] }

const DATA: Section[] = [
  { title: "Queries", rows: [{ label: "Queries per month", free: "20", starter: "300", pro: "Unlimited", team: "Unlimited" }] },
  { title: "Databases", rows: [{ label: "Database connections", free: "1", starter: "2", pro: "Unlimited", team: "Unlimited" }] },
  { title: "History", rows: [{ label: "Query history", free: "7 days", starter: "90 days", pro: "1 year", team: "1 year" }] },
  {
    title: "Insights",
    rows: [
      { label: "Automatic insights", free: false, starter: true, pro: true, team: true },
      { label: "Scheduled insight digests", free: false, starter: true, pro: true, team: true },
    ],
  },
  {
    title: "Exports",
    rows: [
      { label: "CSV & Excel exports", free: false, starter: true, pro: true, team: true },
      { label: "API access", free: false, starter: false, pro: true, team: true },
    ],
  },
  { title: "Team", rows: [{ label: "Seats", free: "1", starter: "3", pro: "10", team: "Unlimited" }] },
  {
    title: "Support",
    rows: [
      { label: "Support level", free: "Community", starter: "Email", pro: "Priority", team: "Dedicated" },
      { label: "SLA", free: false, starter: false, pro: true, team: true },
    ],
  },
]

function CellContent({ v }: { v: Cell }) {
  if (typeof v === "boolean") {
    return v ? <Check className="mx-auto h-5 w-5 text-web-brand" aria-label="Included" /> : <X className="mx-auto h-5 w-5 text-slate-300" aria-label="Not included" />
  }
  return <span className="text-sm text-slate-800">{v}</span>
}

export default function PricingComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm [-webkit-overflow-scrolling:touch]">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="sticky top-0 z-20 border-b border-slate-200 bg-white shadow-sm">
            <th scope="col" className="sticky left-0 z-30 min-w-[180px] bg-white px-4 py-4 text-sm font-semibold text-slate-900">Feature</th>
            <th scope="col" className="min-w-[100px] px-3 py-4 text-center text-sm font-semibold text-slate-900">Free</th>
            <th scope="col" className="min-w-[100px] bg-web-brand-light/40 px-3 py-4 text-center text-sm font-semibold text-web-brand">Starter</th>
            <th scope="col" className="min-w-[100px] px-3 py-4 text-center text-sm font-semibold text-slate-900">Pro</th>
            <th scope="col" className="min-w-[100px] px-3 py-4 text-center text-sm font-semibold text-slate-900">Team</th>
          </tr>
        </thead>
        <tbody>
          {DATA.map((section) => (
            <Fragment key={section.title}>
              <tr className="bg-slate-50">
                <td colSpan={5} className="border-y border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {section.title}
                </td>
              </tr>
              {section.rows.map((row) => (
                <tr key={row.label} className="group border-b border-slate-100 hover:bg-slate-50/80">
                  <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.08)] group-hover:bg-slate-50/80">
                    {row.label}
                  </th>
                  {(["free", "starter", "pro", "team"] as const).map((k) => (
                    <td key={k} className={cn("px-2 py-3 text-center align-middle group-hover:bg-slate-50/80", k === "starter" && "bg-web-brand-light/15")}>
                      <CellContent v={row[k]} />
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
