export default function HelpSupportBanner() {
  return (
    <div className="rounded-2xl border border-web-brand/25 bg-web-brand-light/40 px-6 py-8 text-center sm:px-10">
      <p className="text-lg font-semibold text-slate-900">Still stuck?</p>
      <p className="mt-2 text-slate-600">
        <a href="mailto:support@querify.ai" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
          Contact support
        </a>
        {" "}— we typically reply within one business day.
      </p>
    </div>
  )
}
