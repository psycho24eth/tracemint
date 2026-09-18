"use client";

import Link from "next/link";

import type { License, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, formatMonth, shortAddress } from "@/lib/format";

import { CardFacts, CardRow, CardTitle, Collectible, Layer, phaseFor, serial, TiltCard } from "./Collectible";
import { LicenseCover } from "./LicenseCover";
import { Seal } from "./Seal";

export const licenseSeed = (license: License) => `${license.id}:${license.claimId}:${license.licensee.toLowerCase()}`;

export function LicenseFace({ license, work, idle = false }: { license: License; work?: Work; idle?: boolean }) {
  return (
    <Collectible art={work?.imageUrl} finish="foil" tone="mint" idle={idle} phase={phaseFor(license.id + 7)}>
      <Layer z={10}>
        <CardRow left={`License Nº ${serial(license.id)}`} right="Minted" />
      </Layer>
      <Layer z={26} className="glass-art isolate">
        <LicenseCover seed={licenseSeed(license)} className="block aspect-[4/3] w-full" />
        <div className="foil" aria-hidden="true" />
        {work && (
          <span className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-full border-2 border-foreground/85 shadow-[0_4px_10px_rgb(0_0_0/0.5)]">
            <img src={work.imageUrl} alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-background/70 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em]">
          {shortAddress(license.licensee)}
        </span>
      </Layer>
      <Layer z={18}>
        <CardTitle>{work?.title ?? `Work #${license.workId}`}</CardTitle>
      </Layer>
      <Layer z={10} className="mt-auto">
        <CardFacts
          facts={[
            ["Paid", formatGen(license.amount)],
            ["Until", formatMonth(license.expiresAt)],
          ]}
        />
      </Layer>
      <Layer z={34} className="absolute bottom-4 right-4">
        <Seal className="w-12 text-foreground/55 drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)]" />
      </Layer>
    </Collectible>
  );
}

export function LicenseCard({ license, work, tilt = true }: { license: License; work?: Work; tilt?: boolean }) {
  const face = <LicenseFace license={license} work={work} />;
  return (
    <Link href={`/licenses/${license.id}`} className="group block h-full" aria-label={`License ${license.id}`}>
      {tilt ? <TiltCard>{face}</TiltCard> : face}
    </Link>
  );
}
