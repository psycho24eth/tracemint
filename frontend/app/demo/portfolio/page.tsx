import type { Metadata } from "next";

import { DEMO_COLLECTION } from "@/lib/demo/catalog";

export const metadata: Metadata = {
  robots: "noindex",
};

// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// Validators fetch this page's rendered HTML directly, and the contract's ownership check
// looks for NEXT_PUBLIC_DEMO_CREATOR_ADDRESS as the only 0x... string on the page.
export default function DemoPortfolioPage() {
  const creatorAddress = process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDRESS;

  return (
    <main className="min-h-screen bg-[#f4f2ee] text-[#1c1b19] [font-family:ui-sans-serif,system-ui,-apple-system,'Segoe_UI',sans-serif]">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-widest text-[#8a8479]">Creator portfolio</p>
        <h1 className="mt-2 text-5xl font-bold tracking-tight">Demo Creator</h1>
        <p className="mt-2 text-lg text-[#5f5a52]">Digital paintings, {DEMO_COLLECTION[0].year}</p>

        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_COLLECTION.map((work) => (
            <li key={work.title} className="overflow-hidden rounded-xl bg-white p-3 shadow-sm">
              {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
              <img src={work.original} alt={work.title} className="w-full rounded-lg" width={1200} height={800} />
              <p className="mt-3 font-semibold">{work.title}</p>
              <p className="text-sm text-[#8a8479]">
                {work.style}, {work.year}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-10 space-y-3 rounded-xl bg-white p-5 shadow-sm">
          <p className="break-all font-mono text-sm">Wallet: {creatorAddress}</p>
          <p className="text-[#5f5a52]">Licensing enquiries go through TraceMint.</p>
        </div>
      </div>
    </main>
  );
}
