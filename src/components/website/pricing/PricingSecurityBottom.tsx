import Link from "next/link"

export default function PricingSecurityBottom() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center shadow-sm sm:px-12">
      <p className="text-lg font-medium text-slate-900">Read-only access. AES-256 encryption. Your data stays yours.</p>
      <Link href="/security" className="mt-4 inline-block text-sm font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
        How we keep your database safe →
      </Link>
    </div>
  )
}
