import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex",
};

// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// The sentence below is the dispute proof a site owner submits on-chain, so its wording must
// match the brief verbatim.
export default function DemoPermissionPage() {
  const creatorAddress = process.env.NEXT_PUBLIC_DEMO_CREATOR_ADDRESS;
  const siteOwnerAddress = process.env.NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <p className="text-sm font-medium text-accent">Dispute proof</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Permission letter</h1>

      <div className="brand-card mt-8 space-y-6 p-8">
        <img
          src="/demo/cybernetic-horizon.png"
          alt="Cybernetic Horizon, the licensed artwork"
          className="w-full max-w-xs rounded-md"
          width={1200}
          height={800}
        />

        <p className="leading-relaxed text-foreground">
          {'PERMISSION LETTER: Demo Creator grants Neon Threads permission to use the artwork "Cybernetic Horizon" on its synth hoodie product page for 12 months.'}
        </p>

        <div className="space-y-1 break-all font-mono text-sm text-muted-foreground">
          <p>Creator: {creatorAddress}</p>
          <p>Site owner: {siteOwnerAddress}</p>
        </div>

        <p className="text-muted-foreground">Signed 2026-09-16</p>
      </div>
    </main>
  );
}
