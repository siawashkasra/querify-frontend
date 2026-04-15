import type { Metadata } from "next"
import LegalDocument from "@/components/website/legal/LegalDocument"
import { LEGAL_LAST_UPDATED_ISO, LEGAL_LAST_UPDATED_LABEL } from "@/components/website/legal/lastUpdated"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy — Querify",
  description: "PLACEHOLDER — How Querify collects, uses, and protects your information. Draft pending legal review.",
  path: "/privacy",
})

const ph = <span className="font-semibold text-amber-800">PLACEHOLDER.</span>

export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      lastUpdatedLabel={LEGAL_LAST_UPDATED_LABEL}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
      sections={[
        {
          id: "what-we-collect",
          title: "What information we collect",
          content: (
            <>
              <p>{ph} This section will describe categories of personal data and account information Querify may collect (for example account identifiers, email address, billing details, and technical metadata such as IP address and user agent).</p>
              <p className="mt-4">PLACEHOLDER — The final policy will list each category, the source of the data, and whether providing it is required to use the service.</p>
            </>
          ),
        },
        {
          id: "how-we-use",
          title: "How we use your information",
          content: (
            <>
              <p>{ph} This section will describe the business and operational purposes for processing, such as providing the product, customer support, security, fraud prevention, and communications about the service.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will specify legal bases where applicable (for example contract, legitimate interests, or consent) and whether automated decision-making applies.</p>
            </>
          ),
        },
        {
          id: "database-credentials",
          title: "Database credentials and security",
          content: (
            <>
              <p>{ph} This section will describe how database connection credentials are handled when you connect a data source to Querify (for example encryption in transit, access controls, and organisational measures).</p>
              <p className="mt-4">PLACEHOLDER — The final policy will confirm what Querify stores, what remains in your environment, retention periods, and how credentials can be rotated or revoked.</p>
            </>
          ),
        },
        {
          id: "query-data",
          title: "Query data and result previews",
          content: (
            <>
              <p>{ph} This section will describe what query text, generated SQL, result sets, or previews may be processed to deliver answers and how long such data may be retained.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will clarify whether prompts or results are used to improve models, and any opt-out or configuration options.</p>
            </>
          ),
        },
        {
          id: "analytics",
          title: "Analytics and usage data (PostHog)",
          content: (
            <>
              <p>{ph} This section will describe product analytics collected via PostHog (or a successor tool), such as page views, feature usage, and diagnostic events, and how that data is pseudonymised or aggregated.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will explain how to opt out of non-essential analytics (for example via the cookie banner and browser settings) and link to the cookie policy.</p>
            </>
          ),
        },
        {
          id: "retention",
          title: "Data retention and deletion",
          content: (
            <>
              <p>{ph} This section will describe retention schedules for account data, logs, backups, and derived analytics, and how deletion requests are processed.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will note any legal or security exceptions that extend retention and how long backups may retain deleted content.</p>
            </>
          ),
        },
        {
          id: "your-rights",
          title: "Your rights (GDPR / CCPA)",
          content: (
            <>
              <p>{ph} This section will summarise rights that may apply depending on your location (for example access, rectification, erasure, restriction, portability, objection, and withdrawal of consent).</p>
              <ul>
                <li>PLACEHOLDER — GDPR-focused rights and how to exercise them.</li>
                <li>PLACEHOLDER — California-specific disclosures (CCPA/CPRA) including categories of personal information collected and sold or shared (if applicable).</li>
                <li>PLACEHOLDER — How to appeal a decision or lodge a complaint with a supervisory authority.</li>
              </ul>
            </>
          ),
        },
        {
          id: "processors",
          title: "Data processors and sub-processors",
          content: (
            <>
              <p>{ph} This section will list sub-processors that process personal data on Querify&apos;s behalf (for example hosting, email delivery, analytics, payment processing) and describe due diligence and contractual safeguards.</p>
              <p className="mt-4">PLACEHOLDER — The final policy will include a table or link to an up-to-date sub-processor list and notice process for changes.</p>
            </>
          ),
        },
        {
          id: "contact",
          title: "Contact us",
          content: (
            <>
              <p>{ph} This section will provide contact details for privacy requests and the data protection contact (including email and postal address where required).</p>
              <p className="mt-4">PLACEHOLDER — Insert legal entity name, registered address, and a dedicated privacy inbox (for example privacy@querify.ai) after legal review.</p>
            </>
          ),
        },
      ]}
    />
  )
}
