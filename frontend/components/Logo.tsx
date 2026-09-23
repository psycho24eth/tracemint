import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/** The trace side: a scan frame closing on a found copy. */
function TraceFace() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" fill="#FF5A1F" />
      <path d="M8 12V8h4M20 8h4v4M24 20v4h-4M12 24H8v-4" stroke="#0B0B0B" strokeWidth="2.4" strokeLinecap="square" />
      <circle cx="16" cy="16" r="3.2" fill="#0B0B0B" />
    </svg>
  );
}

/** The mint side: the licence the same copy turns into. */
function MintFace() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" fill="#0B0B0B" />
      <rect x="1.5" y="1.5" width="29" height="29" stroke="#9BF0C8" strokeWidth="2" />
      <path d="M9.5 16.5l4.8 4.8L23 12.5" stroke="#9BF0C8" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}

/**
 * The mark as a slowly turning cube: the scan frame on two faces, the licence it becomes on the other two.
 * It is CSS 3D rather than a canvas so it costs nothing on a phone, holds up at 24px in the navbar, and
 * stops dead for anyone who asks for less motion.
 */
export function LogoMark({ size = "1.5rem", className = "" }: { size?: string; className?: string }) {
  return (
    <span
      className={cn("logo-cube", className)}
      style={{ width: size, height: size, "--logo-half": `calc(${size} / 2)` } as CSSProperties}
      role="img"
      aria-label="TraceMint"
    >
      <span className="logo-turn">
        <span className="logo-face logo-front">
          <TraceFace />
        </span>
        <span className="logo-face logo-back">
          <TraceFace />
        </span>
        <span className="logo-face logo-right">
          <MintFace />
        </span>
        <span className="logo-face logo-left">
          <MintFace />
        </span>
        <span className="logo-face logo-top" />
        <span className="logo-face logo-bottom" />
      </span>
    </span>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`group inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="display-wide text-[0.95rem] leading-none">
        TRACEMINT<span className="text-signal">/</span>
      </span>
    </span>
  );
}
