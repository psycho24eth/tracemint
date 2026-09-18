"use client";

import { useRef, type CSSProperties, type PointerEvent, type ReactNode } from "react";

// The slab's perspective. Every layer's depth correction below divides by it.
const PERSPECTIVE = 1100;
// Rims stacked through the glass: invisible head-on, a solid-looking edge once the card tilts.
const EDGE_DEPTHS = [7, 14, 21, 28];
const FRONT_DEPTH = 34;

/** Places a layer `z` px in front of the glass, scaled back so that at rest it lines up with the card. */
export function depth(z: number): CSSProperties {
  return { transform: `translateZ(${z}px) scale(${(1 - z / PERSPECTIVE).toFixed(4)})` };
}

/** Spreads cards' light sweeps and sways apart, so neighbours never move in step. */
export const phaseFor = (seed: number) => (seed * 0.618034) % 1;

export const serial = (id: number) => String(id).padStart(3, "0");

export type CardTone = "neutral" | "signal" | "mint";

const TONES: Record<CardTone, string> = {
  neutral: "rgb(255 255 255 / 0.45)",
  signal: "rgb(255 90 31 / 0.85)",
  mint: "rgb(155 240 200 / 0.75)",
};

/**
 * The collectible card: a glass slab lit from behind by `art`, with its children floating inside.
 * Wrap children in <Layer> to give them depth. `tone` colours the light along the top edge, and
 * "foil" adds the holographic finish reserved for licenses. `idle` makes the card sway on its own.
 */
export function Collectible({
  children,
  art,
  finish = "glass",
  tone = "neutral",
  idle = false,
  phase = 0,
  className = "",
}: {
  children: ReactNode;
  art?: string;
  finish?: "glass" | "foil";
  tone?: CardTone;
  idle?: boolean;
  phase?: number;
  className?: string;
}) {
  const stage = {
    transform: `perspective(${PERSPECTIVE}px) rotateX(var(--base-rx, 0deg)) rotateY(var(--base-ry, 0deg)) rotateZ(var(--base-rz, 0deg))`,
    "--phase": String(phase),
    "--tone": TONES[tone],
  } as CSSProperties;

  return (
    <div className="glass-stage h-full" style={stage}>
      <div className={`glass-idle h-full ${idle ? "is-idle" : ""}`}>
        <div className={`glass-card ${finish === "foil" ? "glass-foil" : ""} ${className}`}>
          {art ? (
            <img src={art} alt="" aria-hidden="true" className="glass-aura" />
          ) : (
            <div className="glass-aura glass-aura-default" aria-hidden="true" />
          )}
          <div className="glass-body" aria-hidden="true" />
          {EDGE_DEPTHS.map((z) => (
            <div key={z} className="glass-edge" style={depth(z)} aria-hidden="true" />
          ))}
          <div className="glass-content">{children}</div>
          <div className="glass-front" style={depth(FRONT_DEPTH)} aria-hidden="true">
            <div className="glass-glare" />
            <div className="glass-sweep" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Content inside a Collectible, floating `z` px in front of the glass. */
export function Layer({ z, className = "", children }: { z: number; className?: string; children: ReactNode }) {
  return (
    <div className={className} style={depth(z)}>
      {children}
    </div>
  );
}

/**
 * Feeds a fine pointer to the Collectible inside: its tilt, where the glare sits, and the angle the
 * rim catches the light from. Touch and pen input get the idle sway instead, and visitors who
 * prefer reduced motion a still card (both in globals.css).
 */
export function TiltCard({ children, max = 14, className = "" }: { children: ReactNode; max?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const set = (values: Record<string, string>) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = ref.current;
      if (!node) return;
      for (const [name, value] of Object.entries(values)) node.style.setProperty(name, value);
    });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    // Measured on this untransformed wrapper, so the tilting card can't feed back into its own tilt.
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    // A gradient pointing from the pointer through the centre lights the rim nearest the pointer.
    const angle = (Math.atan2(0.5 - x, y - 0.5) * 180) / Math.PI;
    set({
      "--mx": x.toFixed(3),
      "--my": y.toFixed(3),
      "--rx": `${((0.5 - y) * max).toFixed(2)}deg`,
      "--ry": `${((x - 0.5) * max).toFixed(2)}deg`,
      "--light-angle": `${angle.toFixed(1)}deg`,
      "--glare": "1",
    });
  };

  const onPointerLeave = () => set({ "--rx": "0deg", "--ry": "0deg", "--light-angle": "135deg", "--glare": "0" });

  return (
    <div ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={`h-full ${className}`}>
      {children}
    </div>
  );
}

export function CardRow({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[0.625rem] uppercase tracking-[0.16em] text-foreground/75">
      <span className="truncate">{left}</span>
      <span className="shrink-0">{right}</span>
    </div>
  );
}

export function CardFacts({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/10 pt-3 text-xs">
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
  return (
    <h3 className="truncate font-serif text-2xl font-normal leading-none tracking-normal [text-shadow:0_2px_14px_rgb(0_0_0/0.65)]">
      {children}
    </h3>
  );
}

/** Placeholder with the card's proportions while contract data loads. */
export function CardSkeleton({ label }: { label: string }) {
  return (
    <div className="h-full" aria-busy="true">
      <Collectible>
        <Layer z={10}>
          <p className="t-label">{label}</p>
        </Layer>
        <Layer z={22}>
          <div className="aspect-[4/3] animate-pulse rounded-xl bg-foreground/5" />
        </Layer>
        <Layer z={16}>
          <div className="h-5 w-2/3 animate-pulse bg-foreground/5" />
        </Layer>
        <Layer z={10} className="mt-auto">
          <div className="h-8 w-full animate-pulse bg-foreground/5" />
        </Layer>
      </Collectible>
    </div>
  );
}
