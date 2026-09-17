"use client";

import { useId } from "react";

type LogoSize = "sm" | "md" | "lg" | "xl";

const MARK_SIZES: Record<LogoSize, string> = { sm: "h-5 w-5", md: "h-7 w-7", lg: "h-9 w-9", xl: "h-24 w-24" };
const TEXT_SIZES: Record<LogoSize, string> = { sm: "text-base", md: "text-lg", lg: "text-2xl", xl: "text-4xl" };

/**
 * An isometric hexagonal "gem" mark: three faces in different gradient shades
 * (top/right/left) read as a faceted 3D shield, with a bright rim highlight,
 * a soft drop glow, and a lens/scan-line core standing in for the vision check.
 */
export function LogoMark({ size = "md", className = "" }: { size?: LogoSize; className?: string }) {
  const uid = useId();
  const topId = `lh-top-${uid}`;
  const rightId = `lh-right-${uid}`;
  const leftId = `lh-left-${uid}`;
  const lensId = `lh-lens-${uid}`;
  const glowId = `lh-glow-${uid}`;

  return (
    <svg
      className={`${MARK_SIZES[size]} ${className}`}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="TraceMint"
    >
      <defs>
        <linearGradient id={topId} x1="5" y1="2" x2="27" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#b6f4ff" />
          <stop offset="1" stopColor="#00d3f2" />
        </linearGradient>
        <linearGradient id={rightId} x1="16" y1="9.5" x2="27" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#00b8da" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id={leftId} x1="5" y1="9.5" x2="16" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#122a4a" />
          <stop offset="1" stopColor="#1e1040" />
        </linearGradient>
        <radialGradient id={lensId} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#f0feff" />
          <stop offset="0.55" stopColor="#00f2fe" />
          <stop offset="1" stopColor="#7c3aed" />
        </radialGradient>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* subtle drop glow behind the gem */}
      <path
        d="M16 2 27 9.5 27 22.5 16 30 5 22.5 5 9.5 Z"
        fill="#00f2fe"
        opacity="0.22"
        filter={`url(#${glowId})`}
      />

      {/* three isometric faces */}
      <path d="M16 2 27 9.5 16 16 5 9.5 Z" fill={`url(#${topId})`} />
      <path d="M27 9.5 27 22.5 16 30 16 16 Z" fill={`url(#${rightId})`} />
      <path d="M16 16 16 30 5 22.5 5 9.5 Z" fill={`url(#${leftId})`} />

      {/* highlight rim */}
      <path
        d="M16 2 27 9.5 27 22.5 16 30 5 22.5 5 9.5 Z"
        fill="none"
        stroke="#9df1ff"
        strokeOpacity="0.85"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
      <path d="M16 2 27 9.5 16 16 5 9.5 Z" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.5" strokeLinejoin="round" />

      {/* lens / scan core */}
      <circle cx="16" cy="16" r="5.3" fill={`url(#${lensId})`} stroke="#eafcff" strokeOpacity="0.65" strokeWidth="0.6" />
      <path d="M10.9 16h10.2" stroke="#031016" strokeOpacity="0.6" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({
  size = "md",
  showWordmark = true,
  className = "",
}: {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className={`${TEXT_SIZES[size]} font-bold tracking-tight`}>
          Trace<span className="text-gradient">Mint</span>
        </span>
      )}
    </span>
  );
}
