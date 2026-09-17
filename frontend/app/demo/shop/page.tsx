import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex",
};

// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// This is the "infringing shop" -- it must read as an ordinary product page with no mention of
// a licence, permission, or the creator anywhere, and the site owner's address must be the only
// 0x... string on the page, since the contract addresses its notice to that address.
export default function DemoShopPage() {
  const siteOwnerAddress = process.env.NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <p className="text-2xl font-bold tracking-tight">Neon Threads</p>
        <p className="text-sm text-muted-foreground">Streetwear for night owls</p>
      </header>

      <div className="mt-10 grid gap-10 md:grid-cols-2 md:items-start">
        <div className="brand-card overflow-hidden p-3">
          {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
          <img
            src="/demo/synth-hoodie-banner.jpg"
            alt="Synth hoodie, front view"
            className="w-full rounded-md"
            width={960}
            height={640}
          />
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Synth hoodie</h1>
          <p className="mt-2 text-2xl font-semibold text-accent">$49</p>
          <p className="mt-4 text-muted-foreground">
            Heavyweight fleece, oversized fit, printed all-over with our house neon grid graphic. Runs true to
            size and holds its shape wash after wash.
          </p>

          <ul className="mt-6 space-y-1 text-sm text-muted-foreground">
            <li>Sizes: S - XXL</li>
            <li>Ships in 3-5 business days</li>
            <li>Free returns within 30 days</li>
          </ul>

          <button
            type="button"
            className="mt-8 w-full rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground"
          >
            Add to cart
          </button>

          <p className="mt-6 break-all font-mono text-xs text-muted-foreground">Pay us in GEN: {siteOwnerAddress}</p>
        </div>
      </div>
    </main>
  );
}
