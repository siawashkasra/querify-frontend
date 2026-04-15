import type { Metadata } from "next"
import LegalDocument from "@/components/website/legal/LegalDocument"
import { LEGAL_LAST_UPDATED_ISO, LEGAL_LAST_UPDATED_LABEL } from "@/components/website/legal/lastUpdated"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Cookie Policy — Querify",
  description: "PLACEHOLDER — How Querify uses cookies and similar technologies. Draft pending legal review.",
  path: "/cookies",
})

const ph = <span className="font-semibold text-amber-800">PLACEHOLDER.</span>

export default function CookiesPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      lastUpdatedLabel={LEGAL_LAST_UPDATED_LABEL}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
      showCookiePolicyLink={false}
      sections={[
        {
          id: "overview",
          title: "Overview",
          content: (
            <>
              <p>{ph} This policy explains how Querify uses cookies and similar technologies on the website and product. It is not legal advice and must be reviewed by counsel before launch.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will align wording with the privacy policy and regional requirements.</p>
            </>
          ),
        },
        {
          id: "strictly-necessary",
          title: "Strictly necessary cookies",
          content: (
            <>
              <p>{ph} Querify uses strictly necessary cookies (or equivalent storage) required for core functionality such as keeping you signed in, maintaining session state, load balancing, and security (for example CSRF protection where applicable).</p>
              <p className="mt-4">PLACEHOLDER — The final policy will list representative cookie names, purposes, and durations after engineering sign-off.</p>
            </>
          ),
        },
        {
          id: "analytics-posthog",
          title: "Analytics: PostHog",
          content: (
            <>
              <p>{ph} Non-essential analytics may be provided through PostHog to understand how the site and product are used (for example page views, funnels, and feature engagement). These technologies are loaded only if you accept non-essential cookies via the cookie banner.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will describe data categories sent to PostHog, regions, and links to PostHog&apos;s documentation and DPA.</p>
            </>
          ),
        },
        {
          id: "opt-out",
          title: "How to opt out",
          content: (
            <>
              <p>{ph} You can reject non-essential cookies using the &quot;Reject non-essential&quot; option on the cookie banner. If you previously accepted analytics, you can clear site data for Querify in your browser or use the banner controls where available.</p>
              <p className="mt-4">PLACEHOLDER — The final policy may add a preference centre or account setting to change consent without clearing storage.</p>
              <ul>
                <li>Browser settings: PLACEHOLDER — link to guidance for Chrome, Safari, Firefox, Edge.</li>
                <li>PostHog: PLACEHOLDER — describe opt-out behaviour after consent withdrawal.</li>
              </ul>
            </>
          ),
        },
        {
          id: "changes",
          title: "Updates",
          content: (
            <>
              <p>{ph} This cookie policy may be updated when we change technologies or legal requirements. PLACEHOLDER — describe how users will be notified and how the &quot;Last updated&quot; date will be maintained.</p>
            </>
          ),
        },
      ]}
    />
  )
}
