"use client";

import Link from "next/link";

import type { License, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, formatMonth, shortAddress } from "@/lib/format";

import { CardFacts, CardRow, CardTitle, Collectible, TiltCard } from "./Collectible";
import { LicenseCover } from "./LicenseCover";
import { Seal } from "./Seal";

export const licenseSeed = (license: License) => `${license.id}:${license.claimId}:${license.licensee.toLowerCase()}`;

export function LicenseFace({ license, work }: { license: License; work?: Work }) {
  return (
    <Collectible finish="foil">
      <div className="relative flex flex-1 flex-col gap-3 p-4">
        <CardRow left={`License Nº ${String(license.id).padStart(3, "0")}`} right="Minted" />
        <div className="relative overflow-hidden rounded-md">
          <LicenseCover seed={licenseSeed(license)} className="block aspect-[4/3] w-full" />
          {work && (
            <span className="absolute bottom-2 left-2 h-10 w-10 overflow-hidden rounded-full border-2 border-foreground/85 shadow-[0_4px_10px_rgb(0_0_0/0.5)]">
              <img src={work.imageUrl} alt="" className="h-full w-full object-cover" />
            </span>
          )}
          <span className="absolute bottom-2 right-2 bg-background/60 px-1.5 py-0.5 text-[0.55rem] uppercase tracking-[0.14em]">
            {shortAddress(license.licensee)}
          </span>
        </div>
        <CardTitle>{work?.title ?? `Work #${license.workId}`}</CardTitle>
        <CardFacts
          facts={[
            ["Paid", formatGen(license.amount)],
            ["Until", formatMonth(license.expiresAt)],
          ]}
        />
        <Seal className="absolute bottom-3 right-3 w-11 text-foreground/45" />
      </div>
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
