"use client";

import { CardSkeleton } from "@/components/cards/Collectible";
import { WorkCard } from "@/components/cards/WorkCard";
import { PageShell } from "@/components/PageShell";
import RegisterWorkForm from "@/components/RegisterWorkForm";
import { SectionHeading } from "@/components/SectionHeading";
import { useHashScroll } from "@/lib/hooks/useHashScroll";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

export default function WorksPage() {
  const { data: works, isLoading, error } = useWorks();

  // The grid above #register grows when the chain answers, which moves the anchor down the page after
  // the browser has already tried to jump to it. Without this, every link to #register landed at the top.
  useHashScroll(!isLoading);

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

      {/* Named so the walkthrough and the empty dashboard can send someone straight here. */}
      <div id="register" className="mt-20 scroll-mt-24">
        <RegisterWorkForm />
      </div>
    </PageShell>
  );
}
