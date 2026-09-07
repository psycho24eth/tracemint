"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  Shield,
  Search,
  FileCheck,
  Coins,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  Clock,
  Play,
  CheckCircle2,
} from "lucide-react";
import { AppStore } from "@/lib/store";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { MetricCard } from "@/components/MetricCard";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TransactionModal, TxStep } from "@/components/TransactionModal";
import { formatWeiToEther } from "@licensehunter/shared";

export default function DashboardPage() {
  const store = AppStore.getInstance();
  const { isConnected } = useAccount();

  const [state, setState] = useState({
    assets: store.assets,
    detections: store.detections,
    licenses: store.licenses,
    royalties: store.royalties,
    auditEvents: store.auditEvents,
  });

  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  useEffect(() => {
    return store.subscribe(() => {
      setState({
        assets: [...store.assets],
        detections: [...store.detections],
        licenses: [...store.licenses],
        royalties: { ...store.royalties },
        auditEvents: [...store.auditEvents],
      });
    });
  }, [store]);

  const handleWithdrawRoyalties = async () => {
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

  const handleRunDemoSimulation = () => {
    const targetAsset = state.assets[0];
    if (!targetAsset) return;

    const newDetection = {
      id: `c-sim-${Date.now()}`,
      assetId: targetAsset.id,
      assetName: targetAsset.name,
      creatorId: targetAsset.creatorId,
      creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      matchedUrl: "https://decentralized-feed.net/images/cybernetic-remix-preview.png",
      matchedContentHash: targetAsset.contentHash,
      similarityScore: 97.8,
      confidence: "HIGH" as const,
      detectionMethod: "DEMO_SIMILARITY" as const,
      isDemo: true,
      status: "PENDING_REVIEW" as const,
      detectedAt: new Date().toISOString(),
    };

    store.addDetection(newDetection);
  };

  return (
    <div className="space-y-8">
      {/* Disclaimer */}
      <LegalDisclaimer />

      {/* Header and Live Demo Launcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Creator Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor registered IP, triage potential unauthorized usage, and withdraw on-chain royalties.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunDemoSimulation}
            className="gap-1.5 font-mono text-xs"
          >
            <Play className="w-3.5 h-3.5 text-brandCyan fill-brandCyan/20" />
            Trigger Demo Scan
          </Button>
          <Link href="/assets">
            <Button size="sm">Register New IP</Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Registered IP Assets"
          value={state.assets.length}
          subtitle="Cryptographically anchored on-chain"
          icon={<Shield className="w-5 h-5 text-brandCyan" />}
        />
        <MetricCard
          title="Active Detections"
          value={state.detections.length}
          subtitle="Potential unauthorized usage matches"
          icon={<Search className="w-5 h-5 text-amber-400" />}
          highlight={state.detections.length > 0}
        />
        <MetricCard
          title="Active Licenses"
          value={state.licenses.length}
          subtitle="Monetized micro-licensing contracts"
          icon={<FileCheck className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Withdrawable Royalties"
          value={`${formatWeiToEther(state.royalties.pendingBalanceWei)} ETH`}
          subtitle={`Total earned: ${formatWeiToEther(state.royalties.totalEarnedWei)} ETH`}
          icon={<Coins className="w-5 h-5 text-violet-400" />}
        />
      </div>

      {/* Royalty Withdrawal Banner if balance available */}
      {BigInt(state.royalties.pendingBalanceWei || "0") > 0n && (
        <Card className="bg-gradient-to-r from-violet-950/40 via-surface to-brandCyan/10 border-brandCyan/40 flex flex-col sm:flex-row items-center justify-between gap-4 p-6">
          <div>
            <div className="flex items-center gap-2 text-brandCyan text-xs font-mono font-bold uppercase mb-1">
              <Coins className="w-4 h-4" /> Royalties Available For Withdrawal
            </div>
            <h3 className="text-lg font-bold text-white">
              {formatWeiToEther(state.royalties.pendingBalanceWei)} ETH is ready to withdraw
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Pull-based contract architecture. Funds are transferred directly to your wallet via nonReentrant withdrawal.
            </p>
          </div>
          <Button onClick={handleWithdrawRoyalties} size="md">
            Withdraw Royalties Now
          </Button>
        </Card>
      )}

      {/* Main Grid: Detections on Left, Provenance & Evidence on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Detection Activity Radar (2 Columns) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-brandCyan" />
              Potential Unauthorized Usage
            </h3>
            <Link
              href="/detections"
              className="text-xs text-brandCyan hover:underline font-mono flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {state.detections.map((detection) => (
              <Card
                key={detection.id}
                className="hover:border-slate-700 transition-all p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {detection.assetName}
                    </span>
                    <StatusPill status={detection.status} isDemo={detection.isDemo} />
                  </div>
                  <p className="text-xs text-slate-400 font-mono truncate">
                    {detection.matchedUrl}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono pt-1">
                    <span>Similarity: <strong className="text-emerald-400">{detection.similarityScore}%</strong></span>
                    <span>Confidence: <strong className="text-brandCyan">{detection.confidence}</strong></span>
                    <span>Method: {detection.detectionMethod}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Link href={`/detections/${detection.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect Evidence
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Audit Log & Evidence Integrity (1 Column) */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Evidence &amp; Audit Log
          </h3>

          <Card className="p-4 space-y-4">
            <div className="text-xs text-slate-400">
              Every critical lifecycle event is recorded in an immutable audit trail with transaction hashes.
            </div>

            <div className="space-y-3 divide-y divide-surfaceBorder">
              {state.auditEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="pt-2.5 first:pt-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-brandCyan">
                      {event.action}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {event.entityType}: {event.entityId}
                  </p>
                  {event.txHash && (
                    <div className="pt-0.5">
                      <HashDisplay hash={event.txHash} label="Tx" truncate={true} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title="Withdraw Creator Royalties"
        txHash={lastTxHash}
      />
    </div>
  );
}
