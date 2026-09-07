"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldAlert,
  Lock,
  FileText,
  DollarSign,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
} from "lucide-react";
import { AppStore } from "@/lib/store";
import { Detection, EvidenceSnapshot, LicenseOffer } from "@licensehunter/types";
import { sha256Hex, toBytes32, formatEtherToWei } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { Timeline, TimelineStep } from "@/components/Timeline";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { NoticeGeneratorModal } from "@/components/NoticeGeneratorModal";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function DetectionDetailPage() {
  const params = useParams();
  const detectionId = params?.id as string;
  const store = AppStore.getInstance();

  const [detection, setDetection] = useState<Detection | undefined>(
    store.detections.find((d) => d.id === detectionId)
  );

  const [evidence, setEvidence] = useState<EvidenceSnapshot | undefined>(
    store.evidence.find((e) => e.detectionId === detectionId)
  );

  // Modals & UI States
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("0.05");
  const [offerDurationDays, setOfferDurationDays] = useState("30");

  // Transaction States
  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();
  const [txTitle, setTxTitle] = useState("");

  useEffect(() => {
    return store.subscribe(() => {
      const d = store.detections.find((item) => item.id === detectionId);
      setDetection(d);
      setEvidence(store.evidence.find((e) => e.detectionId === detectionId));
    });
  }, [store, detectionId]);

  if (!detection) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-white">Detection Record Not Found</h2>
        <Link href="/detections">
          <Button variant="outline" size="sm">
            Back to Detections
          </Button>
        </Link>
      </div>
    );
  }

  // Anchor Evidence on-chain
  const handleAnchorEvidence = async () => {
    setTxTitle("Anchor Evidence On-Chain (LicenseHunterRegistry.sol)");
    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(async () => {
        let evId = evidence?.id;
        if (!evId) {
          // create snapshot first if not present
          evId = `e-${Date.now()}`;
          const newEv: EvidenceSnapshot = {
            id: evId,
            detectionId: detection.id,
            sourceUrl: detection.matchedUrl,
            capturedAt: new Date().toISOString(),
            contentHash: detection.matchedContentHash,
            metadataHash: toBytes32(await sha256Hex(`${detection.id}-${Date.now()}`)),
            similarityScore: detection.similarityScore,
            provider: "DemoSimilarityEngine",
            providerVersion: "1.2.0",
            rawMetadata: { matchedUrl: detection.matchedUrl },
            isAnchored: true,
            anchoredTxHash: mockTx,
            anchoredBlockNumber: 6542201,
            visibility: "PUBLIC",
            createdAt: new Date().toISOString(),
          };
          store.evidence.push(newEv);
        }

        store.anchorEvidence(evId, mockTx, 6542201);
        setTxStep("CONFIRMED");
      }, 1600);
    }, 1100);
  };

  // Create Micro-License Offer
  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setOfferModalOpen(false);
    setTxTitle("Create Programmable License Offer (LicenseHunterLicensing.sol)");
    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(async () => {
        const termsText = "Non-exclusive commercial micro-license for digital editorial and online promotional display. Sublicensing and derivative redistribution prohibited.";
        const termsHash = toBytes32(await sha256Hex(termsText));

        const offerId = `off-${Date.now()}`;
        const newOffer: LicenseOffer = {
          id: offerId,
          assetId: detection.assetId,
          assetName: detection.assetName,
          creatorAddress: detection.creatorWallet,
          priceWei: formatEtherToWei(offerPrice),
          currency: "ETH",
          durationSeconds: parseInt(offerDurationDays) * 86400,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          termsHash,
          termsText,
          status: "ACTIVE",
          creationTxHash: mockTx,
        };

        store.createLicenseOffer(newOffer, mockTx);
        setTxStep("CONFIRMED");
      }, 1700);
    }, 1200);
  };

  const handleMarkVerified = () => {
    detection.status = "VERIFIED";
    store.addDetection({ ...detection });
  };

  const handleDismiss = () => {
    detection.status = "DISMISSED";
    store.addDetection({ ...detection });
  };

  const existingOffer = store.offers.find((o) => o.assetId === detection.assetId);

  const timelineSteps: TimelineStep[] = [
    { label: "Detected", timestamp: new Date(detection.detectedAt).toLocaleDateString(), status: "COMPLETED", description: `Matched via ${detection.detectionMethod}` },
    { label: "Captured", timestamp: new Date(detection.detectedAt).toLocaleTimeString(), status: "COMPLETED", description: "Perceptual snapshot & metadata recorded" },
    { label: "Hashed", status: "COMPLETED", description: `SHA-256: ${detection.matchedContentHash.slice(0, 16)}...` },
    { label: "Anchored On-Chain", status: evidence?.isAnchored ? "COMPLETED" : "PENDING", description: evidence?.isAnchored ? `Block #${evidence.anchoredBlockNumber}` : "Pending creator anchoring" },
    { label: "Reviewed & Verified", status: detection.status !== "PENDING_REVIEW" ? "COMPLETED" : "CURRENT", description: `Current triage state: ${detection.status}` },
  ];

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex items-center justify-between">
        <Link
          href="/detections"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-brandCyan font-mono"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Detections
        </Link>
        <div className="flex items-center gap-2">
          {detection.status === "PENDING_REVIEW" && (
            <>
              <Button variant="secondary" size="sm" onClick={handleDismiss}>
                Dismiss Match
              </Button>
              <Button variant="outline" size="sm" onClick={handleMarkVerified}>
                Mark Verified
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Header Banner */}
      <Card className="p-6 bg-surface/95 border-surfaceBorder space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" /> POTENTIAL UNAUTHORIZED USAGE
              </span>
              <StatusPill status={detection.status} isDemo={detection.isDemo} />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {detection.assetName}
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-black/40 border border-surfaceBorder rounded-lg px-4 py-2.5">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">
                Similarity
              </span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {detection.similarityScore}%
              </span>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">
                Confidence
              </span>
              <span className="text-xl font-extrabold text-brandCyan font-mono">
                {detection.confidence}
              </span>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="pt-4 border-t border-surfaceBorder flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {!evidence?.isAnchored ? (
              <Button onClick={handleAnchorEvidence} size="sm" className="gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Anchor Evidence On-Chain
              </Button>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-4 h-4" /> Evidence Anchored On-Chain
              </div>
            )}

            {!existingOffer ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOfferModalOpen(true)}
                className="gap-1.5"
              >
                <DollarSign className="w-3.5 h-3.5" /> Create License Offer
              </Button>
            ) : (
              <Link href={`/licenses/${existingOffer.id}`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> View Public License Offer
                </Button>
              </Link>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setNoticeModalOpen(true)}
              className="gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" /> Generate Settlement Notice
            </Button>
          </div>
        </div>
      </Card>

      {/* Side-by-Side Comparison: Original vs Potential Match */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-surfaceBorder">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Original Creator Asset
            </span>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Verified Primary
            </span>
          </div>

          <div className="aspect-video bg-black/60 rounded-lg flex items-center justify-center border border-slate-800 relative overflow-hidden">
            <div className="text-center p-4">
              <ShieldAlert className="w-10 h-10 text-brandCyan/40 mx-auto mb-2" />
              <div className="font-bold text-sm text-white">{detection.assetName}</div>
              <div className="text-xs text-slate-500 mt-1">Creator: {detection.creatorWallet.slice(0, 10)}...</div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-mono">
              <span>Cryptographic Hash:</span>
              <HashDisplay hash={detection.matchedContentHash} truncate={true} />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-3 border-rose-900/30">
          <div className="flex items-center justify-between pb-2 border-b border-surfaceBorder">
            <span className="text-xs font-mono font-bold text-rose-300 uppercase tracking-wider">
              Detected Potential Usage
            </span>
            <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
              Unverified Publication
            </span>
          </div>

          <div className="aspect-video bg-black/60 rounded-lg flex items-center justify-center border border-slate-800 relative overflow-hidden">
            <div className="text-center p-4">
              <ExternalLink className="w-10 h-10 text-rose-400/40 mx-auto mb-2" />
              <div className="font-bold text-sm text-white">Detected Match Location</div>
              <a
                href={detection.matchedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brandCyan underline mt-1 block truncate max-w-xs mx-auto"
              >
                {detection.matchedUrl}
              </a>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-mono">
              <span>Observed Hash:</span>
              <HashDisplay hash={detection.matchedContentHash} truncate={true} />
            </div>
          </div>
        </Card>
      </div>

      {/* Evidence Integrity & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Lock className="w-4 h-4 text-brandCyan" /> Evidence Integrity Snapshot
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 font-mono text-[11px]">Source Location</span>
              <p className="text-slate-200 font-mono truncate">{detection.matchedUrl}</p>
            </div>

            <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 font-mono text-[11px]">Detection Engine</span>
              <p className="text-slate-200 font-mono">DemoSimilarityEngine v1.2.0</p>
            </div>

            <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 font-mono text-[11px]">Evidence Payload Hash</span>
              <HashDisplay hash={detection.matchedContentHash} truncate={true} />
            </div>

            <div className="p-3 bg-black/40 border border-slate-800 rounded-lg space-y-1">
              <span className="text-slate-500 font-mono text-[11px]">On-Chain Anchor Status</span>
              <p className="text-emerald-400 font-mono font-semibold">
                {evidence?.isAnchored ? "VERIFIED (LicenseHunterRegistry)" : "Unanchored"}
              </p>
            </div>
          </div>

          {evidence?.anchoredTxHash && (
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-mono">Blockchain Transaction:</span>
              <HashDisplay
                hash={evidence.anchoredTxHash}
                explorerUrl={`https://sepolia.etherscan.io/tx/${evidence.anchoredTxHash}`}
                truncate={false}
              />
            </div>
          )}
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Verification Timeline
          </h3>
          <Timeline steps={timelineSteps} />
        </Card>
      </div>

      {/* Offer Modal */}
      {offerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="w-full max-w-md bg-surface p-6 space-y-4 border-brandCyan/40">
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Create Micro-License Offer
            </h3>
            <p className="text-xs text-slate-400">
              Create an on-chain offer linked to this asset. Infringers can settle immediately in 1 click.
            </p>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  License Fee (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                  Validity Duration (Days)
                </label>
                <input
                  type="number"
                  required
                  value={offerDurationDays}
                  onChange={(e) => setOfferDurationDays(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setOfferModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm">
                  Broadcast Offer Tx
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Notice Generator Modal */}
      <NoticeGeneratorModal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        assetName={detection.assetName}
        matchedUrl={detection.matchedUrl}
        contentHash={detection.matchedContentHash}
        similarityScore={detection.similarityScore}
        offerLink={
          typeof window !== "undefined"
            ? `${window.location.origin}/licenses/${existingOffer?.id || "off-001"}`
            : "https://licensehunter.site/licenses/off-001"
        }
      />

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title={txTitle}
        txHash={lastTxHash}
      />
    </div>
  );
}
