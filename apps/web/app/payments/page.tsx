"use client";

import React, { useState, useEffect } from "react";
import { Coins, ArrowDownLeft, ShieldCheck, CheckCircle2, History } from "lucide-react";
import { AppStore } from "@/lib/store";
import { RoyaltyAccounting, AuditEvent } from "@licensehunter/types";
import { formatWeiToEther } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import { HashDisplay } from "@/components/HashDisplay";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function PaymentsPage() {
  const store = AppStore.getInstance();
  const [royalties, setRoyalties] = useState<RoyaltyAccounting>(store.royalties);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(store.auditEvents);

  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  useEffect(() => {
    return store.subscribe(() => {
      setRoyalties({ ...store.royalties });
      setAuditEvents([...store.auditEvents]);
    });
  }, [store]);

  const handleWithdraw = async () => {
    if (royalties.pendingBalanceWei === "0") return;

    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(() => {
        store.withdrawCreatorRoyalties(mockTx);
        setTxStep("CONFIRMED");
      }, 1800);
    }, 1200);
  };

  const paymentEvents = auditEvents.filter(
    (e) => e.action === "LICENSE_PURCHASED" || e.action === "ROYALTY_WITHDRAWN"
  );

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Royalty Accounting &amp; Settlements
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Pull-based on-chain royalty balances. No intermediaries hold creator funds.
          </p>
        </div>

        <Button
          onClick={handleWithdraw}
          disabled={royalties.pendingBalanceWei === "0"}
          className="gap-2"
          size="sm"
        >
          <ArrowDownLeft className="w-4 h-4" /> Withdraw Creator Revenue
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <MetricCard
          title="Pending Withdrawable Balance"
          value={`${formatWeiToEther(royalties.pendingBalanceWei)} ETH`}
          subtitle="Available for instant withdrawal"
          icon={<Coins className="w-5 h-5 text-emerald-400" />}
          highlight={BigInt(royalties.pendingBalanceWei || "0") > 0n}
        />
        <MetricCard
          title="Total Withdrawn to Date"
          value={`${formatWeiToEther(royalties.withdrawnBalanceWei)} ETH`}
          subtitle="Historical claimed earnings"
          icon={<ShieldCheck className="w-5 h-5 text-brandCyan" />}
        />
        <MetricCard
          title="Lifetime Revenue Generated"
          value={`${formatWeiToEther(royalties.totalEarnedWei)} ETH`}
          subtitle="Cumulative micro-licensing volume"
          icon={<History className="w-5 h-5 text-violet-400" />}
        />
      </div>

      {/* Protocol Fee Breakdown Card */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Smart Contract Protocol Fee Parameters
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 bg-black/40 border border-slate-800 rounded-lg">
            <span className="text-slate-500 block">Creator Royalty Allocation</span>
            <span className="text-emerald-400 font-bold text-base">97.00% (9,700 BPS)</span>
          </div>
          <div className="p-3 bg-black/40 border border-slate-800 rounded-lg">
            <span className="text-slate-500 block">Protocol Fee</span>
            <span className="text-brandCyan font-bold text-base">3.00% (300 BPS)</span>
          </div>
          <div className="p-3 bg-black/40 border border-slate-800 rounded-lg">
            <span className="text-slate-500 block">Settlement Architecture</span>
            <span className="text-white font-bold text-base">Pull-Based nonReentrant</span>
          </div>
        </div>
      </Card>

      {/* Financial Settlement Ledger */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
          Settlement Ledger &amp; Audit Trail
        </h3>

        {paymentEvents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500 font-mono">
            No on-chain royalty settlements recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-surfaceBorder">
            {paymentEvents.map((evt) => (
              <div
                key={evt.id}
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white">
                      {evt.action.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(evt.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Actor: {evt.actor}
                  </p>
                </div>

                {evt.txHash && (
                  <HashDisplay
                    hash={evt.txHash}
                    explorerUrl={`https://sepolia.etherscan.io/tx/${evt.txHash}`}
                    truncate={true}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title="Withdraw Creator Revenue (LicenseHunterLicensing.withdrawCreatorRevenue)"
        txHash={lastTxHash}
      />
    </div>
  );
}
