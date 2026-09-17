"use client";

import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { WriteAction } from "@/components/WriteAction";
import { formatGen, STATUS_LABELS } from "@/lib/format";
import { useActingAddress } from "@/lib/demo/DemoModeProvider";
import { useEarnings } from "@/lib/hooks/useLicenseHunter";
import { useCreatorLedger } from "@/lib/hooks/useCreatorLedger";

export default function DashboardPage() {
  const actingAddress = useActingAddress();
  const withdrawable = useEarnings(actingAddress);
  const ledger = useCreatorLedger(actingAddress);

  if (!actingAddress) {
    return (
      <PageShell>
        <h1 className="mb-8 text-3xl font-bold text-gradient">Creator dashboard</h1>
        <p className="text-muted-foreground">Connect a wallet or pick a demo role to see earnings.</p>
      </PageShell>
    );
  }

  const withdrawableAmount = withdrawable.data ?? 0n;
  const ledgerData = ledger.data;

  return (
    <PageShell>
      <h1 className="mb-8 text-3xl font-bold text-gradient">Creator dashboard</h1>

      <div className="mb-8 text-sm text-muted-foreground">{actingAddress}</div>

      <div className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="glass space-y-4 rounded-lg p-6">
          <div className="text-sm text-muted-foreground">Withdrawable now</div>
          <div className="text-2xl font-bold">{formatGen(withdrawableAmount)}</div>
          <WriteAction
            method="withdraw_earnings"
            args={[]}
            label="Withdraw"
            disabled={withdrawableAmount === 0n}
          />
        </div>

        {ledgerData && (
          <div className="glass space-y-4 rounded-lg p-6">
            <div className="text-sm text-muted-foreground">Lifetime earnings</div>
            <div className="text-2xl font-bold">{formatGen(ledgerData.lifetimeEarnings)}</div>
          </div>
        )}
      </div>

      {ledgerData && (
        <div className="mb-8">
          <div className="glass rounded-lg p-6">
            <div className="grid gap-4 md:grid-cols-5">
              {(Object.entries(ledgerData.byStatus) as Array<[keyof typeof ledgerData.byStatus, number]>).map(
                ([status, count]) => (
                  <div key={status} className="text-center">
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground">{STATUS_LABELS[status]}</div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      {ledgerData && ledgerData.works.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-semibold">Your works with open notices</h2>
          <div className="space-y-2">
            {ledgerData.works.map((work) => (
              <div key={work.id}>
                {ledgerData.claims
                  .filter((c) => c.workId === work.id && c.status === "NOTICE_ISSUED")
                  .map((claim) => (
                    <Link
                      key={claim.id}
                      href={`/notices/${claim.id}`}
                      className="glass block rounded-lg p-4 transition-colors hover:bg-accent/20"
                    >
                      <div className="font-medium">{work.title}</div>
                      <div className="text-sm text-muted-foreground">Notice #{claim.id}</div>
                    </Link>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Withdrawals are paid out when the transaction finalizes, which takes a few minutes on Studio Next.
      </p>
    </PageShell>
  );
}
