"use client";

import Link from "next/link";

import { CardSkeleton } from "@/components/cards/Collectible";
import { WorkCard } from "@/components/cards/WorkCard";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

/** The newest registered works, as collectible cards. */
export function CollectionPreview() {
  const { data: works, isLoading } = useWorks();
  const shown = [...(works ?? [])].reverse().slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((index) => <CardSkeleton key={index} label="Work" />)}
        {shown.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>
      <Link href="/works" className="btn-line">
        See every work
      </Link>
    </div>
  );
}
