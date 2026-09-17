import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex",
};

// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// Validators fetch this page's rendered HTML directly, and the contract's ownership check
// looks for NEXT_PUBLIC_DEMO_CREATOR_ADDRESS as the only 0x... string on the page.
export default function DemoPortfolioPage() {
  const creatorAddress = process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDRESS;

  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-sm font-medium text-accent">Creator portfolio</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Demo Creator</h1>
      <p className="mt-1 text-lg text-muted-foreground">Cybernetic Horizon, 2026</p>

      <figure className="brand-card mt-8 overflow-hidden p-3">
        {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
        <img
          src="/demo/cybernetic-horizon.png"
          alt="Cybernetic Horizon, a synthwave landscape with a cyan-to-magenta sun over a neon grid"
          className="w-full rounded-md"
          width={1200}
          height={800}
        />
      </figure>

      <div className="brand-card mt-6 space-y-3 p-5">
        <p className="break-all font-mono text-sm text-foreground">Wallet: {creatorAddress}</p>
        <p className="text-muted-foreground">Licensing enquiries go through LicenseHunter.</p>
      </div>
    </main>
  );
}
