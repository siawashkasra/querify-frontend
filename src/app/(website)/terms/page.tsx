import type { Metadata } from "next"
import LegalDocument from "@/components/website/legal/LegalDocument"
import { LEGAL_LAST_UPDATED_ISO, LEGAL_LAST_UPDATED_LABEL } from "@/components/website/legal/lastUpdated"
import { createMetadata } from "@/lib/seo"

export const metadata: Metadata = createMetadata({
  title: "Terms of Service — Querify",
  description: "PLACEHOLDER — Terms governing use of Querify. Draft pending legal review.",
  path: "/terms",
})

const ph = <span className="font-semibold text-amber-800">PLACEHOLDER.</span>

export default function TermsPage() {
  return (
    <LegalDocument
      title="Terms of Service"
      lastUpdatedLabel={LEGAL_LAST_UPDATED_LABEL}
      lastUpdatedIso={LEGAL_LAST_UPDATED_ISO}
      sections={[
        {
          id: "acceptance",
          title: "Acceptance of terms",
          content: (
            <>
              <p>{ph} This section will state that accessing or using Querify constitutes agreement to these terms and identify the agreement date and version.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will describe eligibility, authority to bind an organisation, and incorporation of linked policies (privacy, acceptable use, DPA where applicable).</p>
            </>
          ),
        },
        {
          id: "description",
          title: "Description of service",
          content: (
            <>
              <p>{ph} This section will summarise what Querify provides (for example natural-language analytics against databases you connect) and what is not included (for example professional or legal advice).</p>
              <p className="mt-4">PLACEHOLDER — The final terms will reserve the right to modify features with reasonable notice where required by law.</p>
            </>
          ),
        },
        {
          id: "accounts",
          title: "User accounts and security",
          content: (
            <>
              <p>{ph} This section will cover account creation, accuracy of information, credentials, responsibility for activity under the account, and notification of unauthorised use.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will reference minimum security practices (for example strong passwords and restricted access to connection secrets).</p>
            </>
          ),
        },
        {
          id: "database-access",
          title: "Database access and read-only guarantee",
          content: (
            <>
              <p>{ph} This section will describe how Querify is intended to operate with read-only database access, your obligation to configure permissions appropriately, and limitations of the service&apos;s enforcement mechanisms.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will disclaim liability for misconfiguration, data exposure, or actions taken by users with elevated privileges.</p>
            </>
          ),
        },
        {
          id: "ai-disclaimer",
          title: "AI accuracy disclaimer",
          content: (
            <>
              <p>{ph} This section will state that outputs may be incomplete or incorrect, that you must validate results before relying on them for decisions, and that Querify does not warrant fitness for a particular purpose.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will address prohibited reliance (for example medical, legal, or financial decisions without human review).</p>
            </>
          ),
        },
        {
          id: "billing",
          title: "Payment and billing",
          content: (
            <>
              <p>{ph} This section will describe fees, taxes, invoicing, renewal, trials, refunds, and chargebacks as applicable.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will name the payment processor and link to pricing terms or order forms.</p>
            </>
          ),
        },
        {
          id: "liability",
          title: "Limitation of liability",
          content: (
            <>
              <p>{ph} This section will set out limitations of liability, caps, and exclusions to the extent permitted by law.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will identify any liabilities that cannot be excluded in your jurisdiction and any carve-outs for gross negligence or wilful misconduct where required.</p>
            </>
          ),
        },
        {
          id: "termination",
          title: "Termination",
          content: (
            <>
              <p>{ph} This section will describe suspension and termination rights, effect on data export or deletion, and survival of key provisions.</p>
              <p className="mt-4">PLACEHOLDER — The final terms will specify notice periods and consequences of non-payment or material breach.</p>
            </>
          ),
        },
        {
          id: "governing-law",
          title: "Governing law",
          content: (
            <>
              <p>{ph} This section will specify the governing law and venue for disputes, and any mandatory arbitration or class-action waiver only if valid after legal review.</p>
              <p className="mt-4">PLACEHOLDER — Insert jurisdiction and courts after counsel review.</p>
            </>
          ),
        },
        {
          id: "contact-terms",
          title: "Contact",
          content: (
            <>
              <p>{ph} This section will provide legal and operational contact details for notices under these terms.</p>
              <p className="mt-4">PLACEHOLDER — Insert entity name, address, and support or legal email after review.</p>
            </>
          ),
        },
      ]}
    />
  )
}
