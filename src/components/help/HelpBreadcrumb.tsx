import Link from "next/link"

type Item = { label: string; href?: string }

export default function HelpBreadcrumb({ items }: { items: Item[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span className="text-slate-300" aria-hidden>/</span> : null}
            {it.href ? (
              <Link href={it.href} className="font-medium text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">{it.label}</Link>
            ) : (
              <span className="font-medium text-slate-900">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
