import Link from "next/link"

export default function ReadOnlyUserGuidePage() {
  return (
    <div className="mx-auto max-w-2xl py-12 md:py-20">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Read-only user setup</h1>
      <p className="mt-4 text-slate-600">This guide explains how to create a dedicated read-only database user for Querify. Full documentation will live here.</p>
      <p className="mt-8">
        <Link href="/how-it-works" className="font-semibold text-web-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">← How it works</Link>
      </p>
    </div>
  )
}
