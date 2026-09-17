import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: "noindex",
};

const MORE_PICKS = [
  {
    title: "Midnight Overdrive",
    blurb: "A lone car streaks under a violet sky, chrome reflections trailing behind it.",
    from: "#00f2fe",
    to: "#7928ca",
  },
  {
    title: "Arcade Skyline",
    blurb: "Pixel towers stack against a gradient dusk, straight out of a cabinet attract mode.",
    from: "#7928ca",
    to: "#ff2fd6",
  },
  {
    title: "Chrome Tide",
    blurb: "A synthetic ocean rendered in scanlines, breaking on a beach of static.",
    from: "#00f2fe",
    to: "#3b82f6",
  },
  {
    title: "Vaporwave Boulevard",
    blurb: "Palm trees and marble busts line a boulevard that never quite existed.",
    from: "#ff2fd6",
    to: "#7928ca",
  },
];

// Server component, deliberately standalone: no PageShell, no navigation, no client code.
// This page must credit the creator in the exact wording the agent and validators look for,
// and it must carry no 0x... address anywhere.
export default function DemoBlogPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl px-6 py-16">
      <p className="text-sm font-medium text-accent">LicenseHunter blog</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">Five synthwave artworks we love</h1>
      <p className="mt-4 text-muted-foreground">
        Retro suns, chrome grids, and neon skylines never get old. Here is a short roundup of five pieces from
        the LicenseHunter community that capture the genre at its best, starting with a favorite of ours.
      </p>

      <h2 className="mt-10 text-xl font-semibold">1. Cybernetic Horizon</h2>
      <figure className="brand-card mt-3 overflow-hidden p-3">
        {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
        <img
          src="/demo/cybernetic-horizon.png"
          alt="Cybernetic Horizon, a synthwave landscape with a cyan-to-magenta sun over a neon grid"
          className="w-full rounded-md"
          width={1200}
          height={800}
        />
        <figcaption className="mt-3 px-2 pb-2 text-sm">
          <p className="font-medium text-foreground">Licensed from Demo Creator via LicenseHunter</p>
          <p className="mt-1 text-muted-foreground">License: non-exclusive web license, 12 months.</p>
        </figcaption>
      </figure>

      <ol start={2} className="mt-10 space-y-6">
        {MORE_PICKS.map((pick, index) => (
          <li key={pick.title} className="brand-card p-4">
            <div
              className="h-24 w-full rounded-md"
              style={{ background: `linear-gradient(135deg, ${pick.from}33, ${pick.to}22)` }}
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold text-foreground">
              {index + 2}. {pick.title}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{pick.blurb}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
