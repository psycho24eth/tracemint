"use client";

import Link from "next/link";

import type { Work } from "@/lib/contracts/LicenseHunter";
import { formatGen } from "@/lib/format";

import { CardFacts, CardRow, CardTitle, Collectible, TiltCard } from "./Collectible";

export function WorkCard({ work, tilt = true }: { work: Work; tilt?: boolean }) {
  const card = (
    <Collectible finish="edge">
      <div className="relative flex flex-1 flex-col gap-3 p-4">
        <CardRow left={`Work #${work.id}`} right="Registered" />
        <div className="overflow-hidden rounded-md bg-black">
          <img
            src={work.imageUrl}
            alt={work.title}
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.04]"
            loading="lazy"
          />
        </div>
        <CardTitle>{work.title}</CardTitle>
        <CardFacts
          facts={[
            ["Base price", formatGen(work.basePrice)],
            ["Watching", `${work.watchUrls.length} page${work.watchUrls.length === 1 ? "" : "s"}`],
          ]}
        />
      </div>
    </Collectible>
  );

  return (
    <Link href={`/works/${work.id}`} className="group block h-full" aria-label={`${work.title}, work ${work.id}`}>
      {tilt ? <TiltCard>{card}</TiltCard> : card}
    </Link>
  );
}
