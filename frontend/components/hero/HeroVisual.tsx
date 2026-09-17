"use client";

import dynamic from "next/dynamic";

import { HeroFallback } from "./HeroFallback";

const HeroScene = dynamic(() => import("./HeroScene").then((mod) => mod.HeroScene), {
  ssr: false,
  loading: () => <HeroFallback />,
});

/**
 * Public entry point for the landing page: loads the vanilla three.js scene
 * client-side only, shows the static fallback while it streams in, and pairs
 * the (aria-hidden) canvas with a real text description for screen readers.
 */
export function HeroVisual() {
  return (
    <div className="relative h-full w-full">
      <HeroScene />
      <span className="sr-only">
        A rotating 3D emblem of the TraceMint gem, orbited by artwork tiles that flash cyan when the scanning
        ring sweeps past them, representing the agent finding a copy.
      </span>
    </div>
  );
}
