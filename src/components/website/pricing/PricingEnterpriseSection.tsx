export default function PricingEnterpriseSection() {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-6 py-8 text-center sm:px-10">
      <p className="text-base text-slate-700">
        Need more than 20 seats, custom compliance, or a security review?{" "}
        <a href="mailto:sales@querify.app?subject=Querify%20Enterprise" className="font-semibold text-web-brand underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand rounded-sm">
          Contact us
        </a>
        {" "}— we will route you to the right person.
      </p>
    </div>
  )
}
