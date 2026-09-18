import type { Metadata } from "next";

import { BlogFigure, BlogFrame } from "@/components/demo/BlogFrame";
import { DEMO_TERMS, LICENSE_CREDIT } from "@/lib/demo/catalog";

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

// This page must credit the creator in the exact wording the agent and validators look for,
// and it must carry no 0x... address anywhere.
export default function DemoBlogPage() {
  return (
    <BlogFrame>
      <h1 className="text-4xl font-bold leading-tight">Five synthwave artworks we love</h1>
      <p className="mt-4 text-lg leading-relaxed text-[#4a443b]">
        Retro suns, chrome grids, and neon skylines never get old. Here is a short roundup of five pieces from the
        synthwave community that capture the genre at its best, starting with a favorite of ours.
      </p>

      <h2 className="mt-10 text-2xl font-semibold">1. Cybernetic Horizon</h2>
      <BlogFigure
        image="/demo/cybernetic-horizon.png"
        alt="Cybernetic Horizon, a synthwave landscape with a cyan-to-magenta sun over a neon grid"
        credit={LICENSE_CREDIT}
        terms={DEMO_TERMS.toLowerCase()}
      />

      <ol start={2} className="mt-10 space-y-6">
        {MORE_PICKS.map((pick, index) => (
          <li key={pick.title} className="rounded-lg border border-[#e6dfd2] bg-white p-4">
            <div
              className="h-24 w-full rounded"
              style={{ background: `linear-gradient(135deg, ${pick.from}33, ${pick.to}22)` }}
              aria-hidden="true"
            />
            <p className="mt-3 font-semibold">
              {index + 2}. {pick.title}
            </p>
            <p className="mt-1 text-sm text-[#6f6759]">{pick.blurb}</p>
          </li>
        ))}
      </ol>
    </BlogFrame>
  );
}
