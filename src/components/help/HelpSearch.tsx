"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import type { SearchDoc } from "@/lib/help/loadContent"
import { getCategoryById } from "@/lib/help/categories"

export default function HelpSearch({ index }: { index: SearchDoc[] }) {
  const [q, setQ] = useState("")
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    return index
      .filter((d) => d.searchBlob.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || d.description.toLowerCase().includes(s))
      .slice(0, 12)
  }, [q, index])

  return (
    <div className="relative w-full max-w-2xl">
      <label htmlFor="help-search" className="sr-only">Search help articles</label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          id="help-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search articles…"
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 text-base text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-web-brand focus:ring-2 focus:ring-web-brand/30"
        />
      </div>
      {q.trim().length >= 2 && (
        <ul className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">No articles found.</li>
          ) : (
            results.map((r) => {
              const cat = getCategoryById(r.category)
              const snippet = r.description.slice(0, 120) + (r.description.length > 120 ? "…" : "")
              return (
                <li key={`${r.category}-${r.slug}`}>
                  <Link href={`/help/${r.category}/${r.slug}`} className="block px-4 py-3 text-left transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none">
                    <span className="font-medium text-slate-900">{r.title}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{cat?.name ?? r.category}</span>
                    <span className="mt-1 block text-sm text-slate-600 line-clamp-2">{snippet}</span>
                  </Link>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
