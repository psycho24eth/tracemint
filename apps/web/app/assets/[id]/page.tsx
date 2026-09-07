"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Shield, ArrowLeft, Plus, Play, History, FileCheck, CheckCircle2 } from "lucide-react";
import { AppStore } from "@/lib/store";
import { Asset } from "@licensehunter/types";
import { sha256Hex, toBytes32 } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { Timeline, TimelineStep } from "@/components/Timeline";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function AssetDetailPage() {
  const params = useParams();
  const assetId = params?.id as string;
  const store = AppStore.getInstance();

  const [asset, setAsset] = useState<Asset | undefined>(
    store.assets.find((a) => a.id === assetId)
  );

  const [isAddingVersion, setIsAddingVersion] = useState(false);
  const [newChangelog, setNewChangelog] = useState("");
  const [newVersionHash, setNewVersionHash] = useState("");

  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  useEffect(() => {
    return store.subscribe(() => {
      setAsset(store.assets.find((a) => a.id === assetId));
    });
  }, [store, assetId]);

  if (!asset) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-white">Asset Not Found</h2>
        <Link href="/assets">
          <Button variant="outline" size="sm">
            Return to Assets
          </Button>
        </Link>
      </div>
    );
  }

  const handleRegisterNewVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(async () => {
        const hash = newVersionHash || (await sha256Hex(`${asset.name}-v2-${Date.now()}`));
        store.registerAssetVersion(asset.id, toBytes32(hash), newChangelog || "Asset refinement", mockTx);
        setTxStep("CONFIRMED");
        setIsAddingVersion(false);
        setNewChangelog("");
      }, 1500);
    }, 1000);
  };

  const handleRunScan = () => {
    const newDetection = {
      id: `c-scan-${Date.now()}`,
      assetId: asset.id,
      assetName: asset.name,
      creatorId: asset.creatorId,
      creatorWallet: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      matchedUrl: `https://social-image-aggregator.io/post/${asset.name.toLowerCase().replace(/\s+/g, "-")}`,
      matchedContentHash: asset.contentHash,
      similarityScore: 95.2,
      confidence: "HIGH" as const,
      detectionMethod: "DEMO_SIMILARITY" as const,
      isDemo: true,
      status: "PENDING_REVIEW" as const,
      detectedAt: new Date().toISOString(),
    };
    store.addDetection(newDetection);
  };

  const timelineSteps: TimelineStep[] = (asset.versions || []).map((v) => ({
    label: `Version ${v.versionNumber}`,
    timestamp: new Date(v.createdAt).toLocaleDateString(),
    status: "COMPLETED",
    description: `${v.changelog || "Registered provenance hash"} (${v.contentHash.slice(0, 16)}...)`,
  }));

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex items-center justify-between">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brandCyan font-mono"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assets
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRunScan} className="gap-1.5">
            <Play className="w-3.5 h-3.5" /> Run Scan
          </Button>
          <Button
            size="sm"
            onClick={() => setIsAddingVersion(!isAddingVersion)}
            className="gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Register New Version
          </Button>
        </div>
      </div>

      <Card className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-surfaceBorder">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surfaceBorder text-slate-300 uppercase">
                {asset.type}
              </span>
              <StatusPill status={asset.status} />
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {asset.name}
            </h1>
          </div>

          {asset.registrationTxHash && (
            <div className="text-right">
              <div className="text-xs text-slate-500 font-mono mb-1">
                EVM Registry Anchor
              </div>
              <HashDisplay
                hash={asset.registrationTxHash}
                explorerUrl={`https://sepolia.etherscan.io/tx/${asset.registrationTxHash}`}
                truncate={true}
              />
            </div>
          )}
        </div>

        <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
          {asset.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
            <div className="text-xs text-slate-500 font-mono">Current Content Hash</div>
            <HashDisplay hash={asset.contentHash} truncate={false} />
          </div>

          <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
            <div className="text-xs text-slate-500 font-mono">Metadata Hash</div>
            <HashDisplay hash={asset.metadataHash} truncate={false} />
          </div>
        </div>
      </Card>

      {isAddingVersion && (
        <Card className="border-brandCyan/40 bg-surface/95 p-6 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Register New Version (LicenseHunterRegistry.registerAssetVersion)
          </h3>
          <form onSubmit={handleRegisterNewVersion} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Version Changelog / Description
              </label>
              <input
                type="text"
                required
                value={newChangelog}
                onChange={(e) => setNewChangelog(e.target.value)}
                placeholder="e.g. Master color grade v2, lossless export"
                className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddingVersion(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Sign Version Tx
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-surfaceBorder">
          <History className="w-5 h-5 text-brandCyan" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Provenance Version History
          </h3>
        </div>
        <Timeline steps={timelineSteps} />
      </Card>

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title="Register Asset Version"
        txHash={lastTxHash}
      />
    </div>
  );
}
