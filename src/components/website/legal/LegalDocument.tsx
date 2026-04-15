import type { ReactNode } from "react"
import Link from "next/link"

export type LegalSection = { id: string; title: string; content: ReactNode }

type LegalDocumentProps = {
  title: string
  lastUpdatedLabel: string
  lastUpdatedIso: string
  sections: LegalSection[]
  showCookiePolicyLink?: boolean
}

export default function LegalDocument({ title, lastUpdatedLabel, lastUpdatedIso, sections, showCookiePolicyLink = true }: LegalDocumentProps) {
  return (
    <div className="py-10 pb-20 md:py-14">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-amber-950">DRAFT — PENDING LEGAL REVIEW</p>
        <p className="mt-2 text-sm leading-snug text-amber-950/90">All content on this page is PLACEHOLDER copy for legal review before launch. It does not constitute legal advice.</p>
      </div>
      <div className="mt-10">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">{title}</h1>
        <p className="mt-4 text-lg font-semibold text-slate-700">Last updated: <time dateTime={lastUpdatedIso}>{lastUpdatedLabel}</time></p>
      </div>
      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On this page</p>
          <nav aria-label="Table of contents" className="mt-3">
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:flex-nowrap lg:gap-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="inline-block rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand lg:block lg:px-0 lg:py-1 lg:text-base">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="min-w-0 space-y-14 border-t border-slate-200 pt-10 lg:border-t-0 lg:pt-0">
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-28">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{s.title}</h2>
              <div className="mt-5 text-lg leading-relaxed text-slate-700 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_li]:marker:text-slate-400">{s.content}</div>
            </section>
          ))}
        </div>
      </div>
      <p className="mt-16 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
        Questions? <Link href="/contact" className="font-medium text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Contact us</Link>
        {showCookiePolicyLink ? (
          <>
            {" · "}
            <Link href="/cookies" className="font-medium text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">Cookie policy</Link>
          </>
        ) : null}
      </p>
    </div>
  )
}
