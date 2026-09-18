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
    <main className="min-h-screen bg-[#f4f1ea] px-6 py-16 text-[#23201b] [font-family:Georgia,'Times_New_Roman',serif]">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm uppercase tracking-widest text-[#8a8174] [font-family:ui-sans-serif,system-ui,sans-serif]">
          Dispute proof
        </p>
        <h1 className="mt-2 text-4xl font-bold">Permission letter</h1>

        <div className="mt-8 space-y-6 rounded-lg border border-[#e2dbcc] bg-white p-8 shadow-sm">
          <img
            src="/demo/cybernetic-horizon.png"
            alt="Cybernetic Horizon, the licensed artwork"
            className="w-full max-w-xs rounded"
            width={1200}
            height={800}
          />

          <p className="text-lg leading-relaxed">
            {'PERMISSION LETTER: Demo Creator grants Neon Threads permission to use the artwork "Cybernetic Horizon" on its synth hoodie product page for 12 months.'}
          </p>

          <div className="space-y-1 break-all font-mono text-sm text-[#6f6759]">
            <p>Creator: {creatorAddress}</p>
            <p>Site owner: {siteOwnerAddress}</p>
          </div>

          <p className="text-[#6f6759]">Signed 2026-09-16</p>
        </div>
      </div>
    </main>
  );
}
