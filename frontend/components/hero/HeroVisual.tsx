"use client";

import dynamic from "next/dynamic";

import { HeroFallback } from "./HeroFallback";

const PointCloud = dynamic(() => import("./PointCloud").then((mod) => mod.PointCloud), {
  ssr: false,
  loading: () => <HeroFallback />,
});

/**
 * The hero backdrop: loads the three.js point cloud client-side only, shows the dot-matrix
 * fallback while it streams in, and describes the (aria-hidden) canvas for screen readers.
 */
export function HeroVisual() {
  return (
    <div className="absolute inset-0">
      <PointCloud />
      <span className="sr-only">
        The registered artwork Cybernetic Horizon, drawn as a 3D field of points with an orange scan line passing over
        it, the way the agent looks for copies.
      </span>
    </div>
  );
}
