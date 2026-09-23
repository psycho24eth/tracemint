import type { Metadata } from "next";

/**
 * The address search engines should treat as this site's home. It is deliberately not NEXT_PUBLIC_SITE_URL:
 * that one appears inside on-chain demo URLs and cannot move, while licensehunter.vercel.app still serves
 * the same pages as tracemint.vercel.app. Without one canonical origin the two domains compete for the
 * same rankings. Override it when a custom domain arrives.
 */
const CANONICAL_ORIGIN = (process.env.NEXT_PUBLIC_CANONICAL_URL ?? "https://tracemint.vercel.app").replace(/\/+$/, "");

export const canonicalUrl = (path = "") => `${CANONICAL_ORIGIN}${path}`;

export const SITE_NAME = "TraceMint";
export const SITE_TAGLINE = "Find copies of your art, and turn them into licences";
export const SITE_DESCRIPTION =
  "TraceMint registers your artwork on GenLayer, sends an agent to find copies of it online, has validators judge each copy against your own terms, and lets the site owner settle with an on-chain licence. No lawyers, no takedowns.";

/** One place for the page-level metadata every route repeats, so titles and canonicals cannot drift. */
export function pageMetadata(options: { title: string; description: string; path: string }): Metadata {
  return {
    title: options.title,
    description: options.description,
    alternates: { canonical: options.path },
    openGraph: {
      title: `${options.title} · ${SITE_NAME}`,
      description: options.description,
      url: canonicalUrl(options.path),
      siteName: SITE_NAME,
      type: "website",
    },
  };
}

/**
 * What TraceMint is, in the shape search and answer engines read. Kept as data rather than markup so the
 * same facts feed the page, the crawler and llms.txt instead of being written out three times.
 */
export function siteStructuredData() {
  const url = canonicalUrl("/");
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${url}#website`,
      name: SITE_NAME,
      url,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web browser",
      description: SITE_DESCRIPTION,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Registering a work and scanning for copies is free; TraceMint takes 3% of a licence fee it collects.",
      },
      featureList: [
        "Register artwork with your own licence terms and price",
        "An agent scans the pages you list for copies",
        "GenLayer validators judge each copy and agree on a verdict",
        "Site owners pay a licence on chain, or dispute with proof",
        "Creators withdraw earnings without an intermediary",
      ],
    },
  ];
}

export type Faq = { question: string; answer: string };

/** The questions people actually ask before using this, answered in full sentences a model can quote. */
export const FAQS: Faq[] = [
  {
    question: "What does TraceMint do?",
    answer:
      "TraceMint turns unlicensed use of your artwork into a licence sale. You register a work with your own terms and price, an agent scans the pages you list for copies of it, GenLayer validators judge each copy, and the site owner can settle by paying the licence fee on chain. You keep 97% of every fee.",
  },
  {
    question: "How is a copy judged, and who decides?",
    answer:
      "No single server decides. A GenLayer leader validator reads the page, compares the image with your registered work, and proposes a verdict against your terms. Other validators repeat the work and vote on whether that verdict is reasonable. Only a verdict they agree on is written to the contract, and every step is a transaction anyone can read in the explorer.",
  },
  {
    question: "Why does this need a blockchain at all?",
    answer:
      "Because both sides have to trust the verdict. A notice from a company's own server is that company's opinion; a notice agreed by independent validators, recorded on chain with the evidence, is something a site owner can check and a creator can rely on. GenLayer is the part that makes an AI judgement verifiable instead of private.",
  },
  {
    question: "What does it cost?",
    answer:
      "Registering a work, listing pages and running scans are free beyond network fees. TraceMint takes 3% of a licence fee when a site owner pays; the creator receives 97% and withdraws it directly from the contract.",
  },
  {
    question: "I received a notice. What are my options?",
    answer:
      "Open the notice link. It shows the work, the page the agent found, the validators' reasoning and the fee. You can pay the fee and receive an on-chain licence for that use, or dispute it with a URL that shows the creator's permission — a licence, an email, a credit line. A dispute is judged the same way the claim was.",
  },
  {
    question: "Is a TraceMint notice a legal document?",
    answer:
      "No. A notice is an automated finding reached by validator consensus, and a licence is a payment recorded on chain under terms the creator published. It is a commercial settlement, not legal advice, and it does not replace a lawyer where you need one.",
  },
  {
    question: "Which network does TraceMint run on?",
    answer:
      "GenLayer Studio Next, chain 61997. Test GEN for fees is free from the faucet in the app, so you can try the whole flow without buying anything.",
  },
];

export function faqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}
