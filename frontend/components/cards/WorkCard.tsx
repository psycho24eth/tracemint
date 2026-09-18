"use client";

import Link from "next/link";

import type { Work } from "@/lib/contracts/LicenseHunter";
import { formatGen } from "@/lib/format";

import { CardFacts, CardRow, CardTitle, Collectible, Layer, phaseFor, serial, TiltCard } from "./Collectible";

export function WorkCard({ work, tilt = true }: { work: Work; tilt?: boolean }) {
  const card = (
    <Collectible art={work.imageUrl} phase={phaseFor(work.id)}>
      <Layer z={10}>
        <CardRow left={`Work Nº ${serial(work.id)}`} right="Registered" />
      </Layer>
      <Layer z={26} className="glass-art bg-black">
        <img
          src={work.imageUrl}
          alt={work.title}
          className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.05]"
        />
      </Layer>
      <Layer z={18}>
        <CardTitle>{work.title}</CardTitle>
      </Layer>
      <Layer z={10} className="mt-auto">
        <CardFacts
          facts={[
            ["Base price", formatGen(work.basePrice)],
            ["Watching", `${work.watchUrls.length} page${work.watchUrls.length === 1 ? "" : "s"}`],
          ]}
        />
      </Layer>
    </Collectible>
  );

  return (
    <Link href={`/works/${work.id}`} className="group block h-full" aria-label={`${work.title}, work ${work.id}`}>
      {tilt ? <TiltCard>{card}</TiltCard> : card}
    </Link>
  );
}
