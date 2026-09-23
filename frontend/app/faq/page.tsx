import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { faqStructuredData, FAQS, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Questions and answers",
  description:
    "How TraceMint judges a copy, what a notice means, what it costs, and what to do if you received one.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <PageShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData()) }} />
      <header className="mb-12 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          Questions
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">Straight answers</h1>
        <p className="max-w-2xl text-muted-foreground">
          What TraceMint does, who decides a verdict, what it costs, and what your options are if a notice names your
          page. If something here is still unclear, the{" "}
          <Link href="/judges" className="t-link">
            five-minute walkthrough
          </Link>{" "}
          runs the whole flow on chain in front of you.
        </p>
      </header>

      <dl className="border-t border-line">
        {FAQS.map((faq) => (
          <div key={faq.question} className="grid gap-3 border-b border-line py-8 md:grid-cols-12 md:gap-8">
            <dt className="display-wide text-base leading-tight md:col-span-5">{faq.question}</dt>
            <dd className="text-muted-foreground md:col-span-7">{faq.answer}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
        Notices are automated findings reached by validator consensus, not legal advice. Fees and terms are set by the
        creator who registered the work.
      </p>
    </PageShell>
  );
}
