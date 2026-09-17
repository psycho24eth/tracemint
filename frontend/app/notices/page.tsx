"use client";

import Link from "next/link";
import { formatGen, formatDate, STATUS_LABELS, VERDICT_LABELS } from "@/lib/format";
import { useNotices } from "@/lib/hooks/useLicenseHunter";
import { PageShell } from "@/components/PageShell";
import { Badge } from "@/components/ui/badge";

export default function NoticesPage() {
  const { data: notices, isLoading, error } = useNotices();

  return (
    <PageShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold">Notices</h1>
        </div>

        {isLoading && <p className="text-muted-foreground">Loading notices…</p>}
        {error && <p className="text-destructive">Error: {error.message}</p>}

        {!isLoading && !error && (!notices || notices.length === 0) && (
          <p className="text-muted-foreground">No notices yet. Register a work and run a scan.</p>
        )}

        {!isLoading && !error && notices && notices.length > 0 && (
          <div className="space-y-4">
            {[...notices].reverse().map((notice) => (
              <Link key={notice.id} href={`/notices/${notice.id}`}>
                <div className="glass p-6 hover:border-accent transition-colors cursor-pointer">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{notice.pageUrl}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="font-semibold">{VERDICT_LABELS[notice.verdict]}</span>
                        <Badge>{STATUS_LABELS[notice.status]}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatGen(notice.fee)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
