"use client"

import { Accordion, AccordionContent, AccordionHeader, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

const FAQ: { q: string; a: string }[] = [
  { q: "Is there a free trial?", a: "Yes. Starter, Pro, and Team include a 14-day free trial before billing begins. The Free plan costs nothing and never needs a card." },
  { q: "Can I switch plans?", a: "Yes. Move up or down anytime. Changes apply on your next billing cycle unless we tell you otherwise at checkout." },
  { q: "What happens when I hit my query limit?", a: "We will let you know. You can upgrade, wait until your limit resets, or export what you need before the window closes." },
  { q: "Do you store my database data?", a: "We do not copy your whole database. We keep the minimum needed to run queries, show history, and improve your workspace—under your controls." },
  { q: "What databases are supported?", a: "PostgreSQL and MySQL are supported today, with more engines on the roadmap. Ask us if you use something else." },
  { q: "Is my database connection secure?", a: "Yes. Read-only access, AES-256 encryption in transit, optional static IP allowlisting, and clear separation so your data stays yours." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your account. Paid plans stop renewing; you keep access until the end of the period you already paid for." },
  { q: "Do you offer refunds?", a: "If an annual plan is not a fit, email support within 14 days of the charge and we will work something out." },
  { q: "What is a database connection?", a: "One linked database your workspace can query. Higher plans raise how many connections and seats you can use at once." },
  { q: "Do you offer discounts for startups or non-profits?", a: "Sometimes. Email sales@querify.app with a short note on what you do and we will take a look." },
]

export default function PricingFaq() {
  return (
    <Accordion type="single" collapsible className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
      {FAQ.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`} className="px-4 data-[state=open]:bg-slate-50/50">
          <AccordionHeader>
            <AccordionTrigger className="group flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-semibold text-slate-900 transition-colors hover:text-web-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-brand focus-visible:ring-offset-2 [&[data-state=open]>svg]:rotate-180">
              {item.q}
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300" aria-hidden />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionContent className="overflow-hidden text-sm leading-relaxed text-slate-600 data-[state=closed]:animate-pricing-accordion-up data-[state=open]:animate-pricing-accordion-down">
            <p className="pb-4 pr-2">{item.a}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
