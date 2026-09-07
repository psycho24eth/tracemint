"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import {
  Shield,
  FileCheck2,
  Lock,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Download,
  Share2,
  QrCode,
  Coins,
} from "lucide-react";
import { AppStore } from "@/lib/store";
import { LicenseOffer, License } from "@licensehunter/types";
import { formatWeiToEther, truncateAddress } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function PublicLicensePage() {
  const params = useParams();
  const id = params?.id as string;
  const store = AppStore.getInstance();
  const { address, isConnected } = useAccount();

  // Try finding either existing license or offer by ID
  const [offer, setOffer] = useState<LicenseOffer | undefined>(
    store.offers.find((o) => o.id === id)
  );
  const [license, setLicense] = useState<License | undefined>(
    store.licenses.find((l) => l.id === id || (offer && l.assetId === offer.assetId))
  );

  // Transaction state
  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  useEffect(() => {
    return store.subscribe(() => {
      const off = store.offers.find((o) => o.id === id);
      const lic = store.licenses.find((l) => l.id === id || (off && l.assetId === off.assetId));
      setOffer(off);
      setLicense(lic);
    });
  }, [store, id]);

  const handlePurchaseLicense = async () => {
    if (!offer) return;

    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(() => {
        const licenseeWallet = address || "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
        const activated = store.purchaseLicense(offer.id, licenseeWallet, mockTx);
        setLicense(activated);
        setTxStep("CONFIRMED");
      }, 2000);
    }, 1200);
  };

  const asset = store.assets.find((a) => a.id === (offer?.assetId || license?.assetId));

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <LegalDisclaimer />

      {/* Activated License Certificate (If Purchased) */}
      {license && (
        <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-surface to-surface p-8 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <FileCheck2 className="w-48 h-48 text-emerald-400" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surfaceBorder relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  On-Chain Digital IP Certificate
                </span>
                <h2 className="text-2xl font-extrabold text-white tracking-tight">
                  LICENSE ACTIVE
                </h2>
              </div>
            </div>

            <StatusPill status="ACTIVE" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs relative z-10">
            <div className="space-y-4">
              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Licensed Asset
                </span>
                <span className="text-base font-bold text-white">
                  {license.assetName}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Licensor (Creator)
                </span>
                <HashDisplay hash={license.creatorAddress} truncate={true} />
              </div>

              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Licensee (Grantee)
                </span>
                <HashDisplay hash={license.licenseeAddress} truncate={true} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Valid Period
                </span>
                <span className="text-white font-mono">
                  {new Date(license.startsAt).toLocaleDateString()} &mdash;{" "}
                  {new Date(license.expiresAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Fee Settled On-Chain
                </span>
                <span className="text-emerald-400 font-mono font-bold text-sm">
                  {formatWeiToEther(license.pricePaidWei)} ETH
                </span>
              </div>

              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Settlement Transaction
                </span>
                <HashDisplay
                  hash={license.purchaseTxHash}
                  explorerUrl={`https://sepolia.etherscan.io/tx/${license.purchaseTxHash}`}
                  truncate={true}
                />
              </div>
            </div>
          </div>

          <div className="p-4 bg-black/50 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-400 space-y-1 relative z-10">
            <span className="text-slate-500 font-bold block">Terms Hash Anchor:</span>
            <span>{license.termsHash}</span>
          </div>

          <div className="pt-4 border-t border-surfaceBorder flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono relative z-10">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Immutable cryptographic record verified on Sepolia testnet</span>
            </div>
            <Link href="/payments">
              <Button variant="outline" size="sm">
                View Creator Royalty Ledger
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Public License Offer Purchase Card (If not yet licensed) */}
      {offer && !license && (
        <Card className="border-brandCyan/40 bg-surface/95 p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-surfaceBorder">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-brandCyan font-bold">
                LicenseHunter Settlement Offer
              </span>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
                {offer.assetName}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Authorized digital publication grant directly from verified creator.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">
                Licensing Fee
              </span>
              <span className="text-3xl font-extrabold text-brandCyan font-mono">
                {formatWeiToEther(offer.priceWei)} ETH
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Creator / Rights Holder
                </span>
                <HashDisplay hash={offer.creatorAddress} truncate={true} />
              </div>

              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Duration
                </span>
                <span className="text-white font-mono font-semibold">
                  {Math.round(offer.durationSeconds / 86400)} Calendar Days
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-slate-500 font-mono uppercase block text-[10px]">
                  Scope &amp; Rights Granted
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {offer.termsText}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-black/40 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Terms Hash Anchor:</span>
              <HashDisplay hash={offer.termsHash} truncate={true} />
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400">Offer Expiration:</span>
              <span className="text-white">{new Date(offer.expiresAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-surfaceBorder flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-400">
              Payments are executed via smart contract (97% creator royalty / 3% protocol fee).
            </div>
            <Button
              size="lg"
              onClick={handlePurchaseLicense}
              className="w-full sm:w-auto gap-2"
            >
              <Coins className="w-4 h-4" /> Accept &amp; Settle License
            </Button>
          </div>
        </Card>
      )}

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title="Purchase & Activate Micro-License (LicenseHunterLicensing.sol)"
        txHash={lastTxHash}
      />
    </div>
  );
}
