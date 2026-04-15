import Image from "next/image"
import Link from "next/link"
import SectionShell from "@/components/website/landing/SectionShell"
import { Check } from "lucide-react"
import HowItWorksFooterCta from "./HowItWorksFooterCta"

const CHIPS = ["What is my MRR?", "Who are my top customers?"] as const

export default function HowItWorksContent() {
  return (
    <div className="pb-16 pt-8 md:pb-24 md:pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-hero-sm font-bold tracking-tight text-slate-900 sm:text-hero-md md:text-hero-lg">From database to insight in 90 seconds</h1>
      </header>
      <SectionShell>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-bold uppercase tracking-wide text-web-brand">Step 1 · Connect</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Connect your database</h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
              <p>Enter your database host, name, username, and password.</p>
              <p>Takes 60 seconds. We verify read-only access before proceeding.</p>
              <p>We recommend creating a dedicated read-only user — our guide walks you through it.</p>
              <p>
                <Link href="/help/read-only-user" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
                  Read-only user setup guide
                </Link>
              </p>
            </div>
          </div>
          <div className="relative order-1 aspect-[960/540] w-full overflow-hidden rounded-xl border border-slate-200 shadow-lg lg:order-2">
            <Image src="/images/how-it-works/connect-form.png" alt="Database connection form with host, database name, username, and password fields" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </SectionShell>
      <SectionShell className="bg-slate-50/80">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="relative aspect-[960/540] w-full overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            <Image src="/images/how-it-works/learn-progress.png" alt="Progress indicator while Querify analyses your database structure" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-web-brand">Step 2 · Querify learns</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">We map your data for you</h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
              <p>We analyse your database structure automatically.</p>
              <p>We infer what your tables mean — customers, revenue, subscriptions — without you configuring anything.</p>
              <p>This takes about 30 seconds and happens once.</p>
            </div>
          </div>
        </div>
      </SectionShell>
      <SectionShell>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="order-2 lg:order-1">
            <p className="text-xs font-bold uppercase tracking-wide text-web-brand">Step 3 · Ask</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Ask in plain English</h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">Type any business question in plain English.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {CHIPS.map((c) => (
                <span key={c} className="rounded-full border border-web-brand/25 bg-web-brand-light/60 px-4 py-2 text-sm font-medium text-web-brand">{c}</span>
              ))}
            </div>
          </div>
          <div className="relative order-1 aspect-[960/540] w-full overflow-hidden rounded-xl border border-slate-200 shadow-lg lg:order-2">
            <Image src="/images/how-it-works/chat-interface.png" alt="Chat interface with a business question in plain English" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </SectionShell>
      <SectionShell className="bg-slate-50/80">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="relative aspect-[960/540] w-full overflow-hidden rounded-xl border border-slate-200 shadow-lg">
            <Image src="/images/how-it-works/result-card.png" alt="Answer card with summary, chart, and SQL" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-web-brand">Step 4 · Get your answer</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Answers you can trust</h2>
            <p className="mt-4 text-base font-medium text-slate-800">Every answer includes:</p>
            <ul className="mt-3 flex flex-col gap-3 text-base text-slate-600">
              <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-web-brand" aria-hidden />Plain-language summary</li>
              <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-web-brand" aria-hidden />Chart (when relevant)</li>
              <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-web-brand" aria-hidden />The SQL we used — so you can verify it</li>
              <li className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-web-brand" aria-hidden />Source tables and any assumptions made</li>
            </ul>
          </div>
        </div>
      </SectionShell>
      <SectionShell>
        <div className="mx-auto max-w-3xl text-center lg:text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-web-brand">It gets smarter</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">Insights find you</h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>Querify generates daily insights without you asking.</p>
            <p>If something changes in your data, you will know.</p>
            <p>The more you use it, the more accurately it understands your business.</p>
          </div>
        </div>
      </SectionShell>
      <div className="mx-auto max-w-3xl py-12 md:py-16">
        <HowItWorksFooterCta />
      </div>
    </div>
  )
}
