"use client";

import { LicenseCard } from "@/components/cards/LicenseCard";
import { NoticeCard } from "@/components/cards/NoticeCard";
import { WorkCard } from "@/components/cards/WorkCard";
import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import { WriteAction } from "@/components/WriteAction";
import { formatGen, STATUS_LABELS } from "@/lib/format";
import { useActingAddress } from "@/lib/demo/DemoModeProvider";
import { useEarnings, useLicensesFor, useWorks } from "@/lib/hooks/useLicenseHunter";
import { useCreatorLedger } from "@/lib/hooks/useCreatorLedger";

export default function DashboardPage() {
  const actingAddress = useActingAddress();
  const withdrawable = useEarnings(actingAddress);
  const ledger = useCreatorLedger(actingAddress);
  const licenses = useLicensesFor(actingAddress);
  const works = useWorks();

  if (!actingAddress) {
    return (
      <PageShell>
        <SectionHeading as="h1" kicker="Your account" title="Dashboard">
          Connect a wallet or pick a demo role to see earnings. Judges can unlock the demo roles on the Judges page.
        </SectionHeading>
      </PageShell>
    );
  }

  const withdrawableAmount = withdrawable.data ?? 0n;
  const ledgerData = ledger.data;
  const workById = new Map((works.data ?? ledgerData?.works ?? []).map((work) => [work.id, work]));
  const openNotices = (ledgerData?.claims ?? []).filter((claim) => claim.status === "NOTICE_ISSUED");
  const ownedLicenses = [...(licenses.data ?? [])].reverse();

  return (
    <PageShell>
      <SectionHeading as="h1" kicker="Your account" title="Dashboard">
        <span className="break-all">{actingAddress}</span>
      </SectionHeading>

      <div className="mt-10 grid gap-px border border-line bg-[var(--line-strong)] md:grid-cols-2">
        <div className="space-y-5 bg-background p-6">
          <p className="t-label">Withdrawable now</p>
          <p className="display-wide text-5xl text-signal">{formatGen(withdrawableAmount)}</p>
          <WriteAction method="withdraw_earnings" args={[]} label="Withdraw" disabled={withdrawableAmount === 0n} />
        </div>
        {ledgerData && (
          <div className="space-y-5 bg-background p-6">
            <p className="t-label">Lifetime earnings</p>
            <p className="display-wide text-5xl">{formatGen(ledgerData.lifetimeEarnings)}</p>
            <p className="text-xs text-muted-foreground">97% of every license fee paid for your works.</p>
          </div>
        )}
      </div>

      {ledgerData && (
        <dl className="mt-px grid grid-cols-2 gap-px border border-t-0 border-line bg-[var(--line-strong)] md:grid-cols-5">
          {(Object.entries(ledgerData.byStatus) as Array<[keyof typeof ledgerData.byStatus, number]>).map(([status, count]) => (
            <div key={status} className="bg-background px-4 py-3">
              <dt className="t-label">{STATUS_LABELS[status]}</dt>
              <dd className="display-wide mt-1 text-2xl">{count}</dd>
            </div>
          ))}
        </dl>
      )}

      {openNotices.length > 0 && (
        <section className="mt-16" aria-labelledby="open-notices">
          <h2 id="open-notices" className="t-label mb-6 text-foreground">
            <span className="t-index mr-2">01</span>
            Open notices on your works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...openNotices].reverse().map((claim) => (
              <NoticeCard key={claim.id} claim={claim} work={workById.get(claim.workId)} />
            ))}
          </div>
        </section>
      )}

      {ledgerData && ledgerData.works.length > 0 && (
        <section className="mt-16" aria-labelledby="your-works">
          <h2 id="your-works" className="t-label mb-6 text-foreground">
            <span className="t-index mr-2">02</span>
            Your works
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ledgerData.works.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        </section>
      )}

      {ownedLicenses.length > 0 && (
        <section className="mt-16" aria-labelledby="your-licenses">
          <h2 id="your-licenses" className="t-label mb-6 text-foreground">
            <span className="t-index mr-2">03</span>
            Licenses you hold
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ownedLicenses.map((license) => (
              <LicenseCard key={license.id} license={license} work={workById.get(license.workId)} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-12 text-xs text-muted-foreground">
        Withdrawals are paid out when the transaction finalizes, which takes a few minutes on Studio Next.
      </p>
    </PageShell>
  );
}
