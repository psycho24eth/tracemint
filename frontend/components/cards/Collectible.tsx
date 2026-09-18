"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * The collectible card shell. "edge" adds the thin holographic border used on works, "foil" the
 * full iridescent finish reserved for licenses.
 */
export function Collectible({
  children,
  finish = "plain",
  className = "",
}: {
  children: ReactNode;
  finish?: "plain" | "edge" | "foil";
  className?: string;
}) {
  const finishClass = finish === "edge" ? "collectible-edge" : finish === "foil" ? "sheen" : "";
  return (
    <div className={`collectible h-full ${finishClass} ${className}`}>
      {finish === "foil" && (
        <>
          <div className="foil" aria-hidden="true" />
          <div className="guilloche" aria-hidden="true" />
        </>
      )}
      {children}
    </div>
  );
}

/**
 * Tilts its child toward a fine pointer and feeds the pointer position to the foil (--mx, --my).
 * Touch and pen input, and visitors who prefer reduced motion, get a still card.
 */
export function TiltCard({ children, max = 12, className = "" }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const update = (x: number, y: number, active: boolean) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      node.style.setProperty("--mx", x.toFixed(3));
      node.style.setProperty("--my", y.toFixed(3));
      node.style.setProperty("--rx", `${active ? ((0.5 - y) * max).toFixed(2) : 0}deg`);
      node.style.setProperty("--ry", `${active ? ((x - 0.5) * max).toFixed(2) : 0}deg`);
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    update((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height, true);
  };

  return (
    <div className={`h-full [perspective:900px] ${className}`}>
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        onPointerLeave={() => update(0.5, 0.5, false)}
        className="h-full transition-transform duration-200 ease-[var(--ease-out)] [transform:rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] motion-reduce:[transform:none]"
      >
        {children}
      </div>
    </div>
  );
}

export function CardRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[0.625rem] uppercase tracking-[0.16em] text-foreground/70">
      <span className="truncate">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

export function CardFacts({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      {facts.map(([term, value]) => (
        <div key={term} className="min-w-0">
          <dt className="text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground">{term}</dt>
          <dd className="mt-0.5 truncate">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="truncate font-serif text-2xl font-normal leading-none tracking-normal">{children}</h3>;
}

/** Placeholder with the card's proportions while contract data loads. */
export function CardSkeleton({ label }: { label: string }) {
  return (
    <div className="collectible h-full animate-pulse p-4" aria-busy="true">
      <p className="t-label">{label}</p>
      <div className="mt-3 aspect-[4/3] rounded-md bg-foreground/5" />
      <div className="mt-4 h-5 w-2/3 bg-foreground/5" />
      <div className="mt-4 h-8 w-full bg-foreground/5" />
    </div>
  );
}
