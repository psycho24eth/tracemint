"use client";

import { CardSkeleton } from "@/components/cards/Collectible";
import { WorkCard } from "@/components/cards/WorkCard";
import { PageShell } from "@/components/PageShell";
import RegisterWorkForm from "@/components/RegisterWorkForm";
import { SectionHeading } from "@/components/SectionHeading";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

export default function WorksPage() {
  const { data: works, isLoading, error } = useWorks();

  return (
    <PageShell>
      <SectionHeading as="h1" kicker="The collection" title="Registered works">
        Each work was registered by a creator whose wallet validators found on their portfolio page. The agent watches the
        pages listed for each one.
      </SectionHeading>

      {error && <p className="mt-8 text-destructive">{error.message}</p>}
      {!isLoading && !error && works?.length === 0 && <p className="mt-8 text-muted-foreground">No works registered yet.</p>}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && [0, 1, 2].map((index) => <CardSkeleton key={index} label="Work" />)}
        {works?.map((work) => (
          <WorkCard key={work.id} work={work} />
        ))}
      </div>

      <div className="mt-20">
        <RegisterWorkForm />
      </div>
    </PageShell>
  );
}
