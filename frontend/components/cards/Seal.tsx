"use client";

import { useId } from "react";

/** The embossed seal on licence cards. Decoration: a licence is a contract record, not a token. */
export function Seal({ className = "" }: { className?: string }) {
  const ringId = `seal-${useId()}`;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <path id={ringId} d="M50,50 m-35,0 a35,35 0 1,1 70,0 a35,35 0 1,1 -70,0" />
      </defs>
      <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="50" cy="50" r="26" fill="none" stroke="currentColor" strokeWidth="0.8" />
      <text fontSize="8.6" letterSpacing="2" fill="currentColor">
        <textPath href={`#${ringId}`}>RECORDED ON GENLAYER · TRACEMINT ·</textPath>
      </text>
      <path d="M50 37.5l3.6 8.4 9.1.6-7 5.8 2.3 8.8-8-5-8 5 2.3-8.8-7-5.8 9.1-.6z" fill="currentColor" />
    </svg>
  );
}
