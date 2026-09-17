"use client";

import { useWorks } from "@/lib/hooks/useLicenseHunter";
import { formatGen, shortAddress } from "@/lib/format";
import { PageShell } from "@/components/PageShell";
import RegisterWorkForm from "@/components/RegisterWorkForm";
import Link from "next/link";

export default function WorksPage() {
  const { data: works, isLoading, error } = useWorks();

  return (
    <PageShell>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Registered works</h1>

        {isLoading && <p className="text-muted-foreground">Loading works…</p>}

        {error && <p className="text-destructive">{error.message}</p>}

        {works && works.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {works.map((work) => (
              <Link key={work.id} href={`/works/${work.id}`}>
                <div className="brand-card cursor-pointer hover:opacity-80 transition">
                  <img
                    src={work.imageUrl}
                    alt={work.title}
                    className="w-full aspect-square object-cover rounded mb-4"
                  />
                  <h3 className="font-bold text-lg mb-1">{work.title}</h3>
                  <p className="text-sm text-muted-foreground mb-1">{formatGen(work.basePrice)}</p>
                  <p className="text-xs text-muted-foreground">by {shortAddress(work.creator)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <RegisterWorkForm />
      </div>
    </PageShell>
  );
}
