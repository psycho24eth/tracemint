"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Plus, Shield, Upload, FileText, CheckCircle2, Layers, ArrowUpRight } from "lucide-react";
import { AppStore } from "@/lib/store";
import { Asset, AssetType } from "@licensehunter/types";
import { sha256Hex, toBytes32 } from "@licensehunter/shared";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { StatusPill } from "@/components/StatusPill";
import { HashDisplay } from "@/components/HashDisplay";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { TransactionModal, TxStep } from "@/components/TransactionModal";

export default function AssetsPage() {
  const store = AppStore.getInstance();
  const { address, isConnected } = useAccount();

  const [assets, setAssets] = useState<Asset[]>(store.assets);
  const [isRegistering, setIsRegistering] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("IMAGE");
  const [fileContent, setFileContent] = useState<string>("");
  const [computedHash, setComputedHash] = useState<string>("");
  const [suggestedPrice, setSuggestedPrice] = useState("0.05");

  // Transaction State Machine
  const [txStep, setTxStep] = useState<TxStep>("IDLE");
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  useEffect(() => {
    return store.subscribe(() => {
      setAssets([...store.assets]);
    });
  }, [store]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!name) {
      setName(file.name.replace(/\.[^/.]+$/, ""));
    }

    const arrayBuffer = await file.arrayBuffer();
    const hash = await sha256Hex(arrayBuffer);
    setComputedHash(hash);
    setFileContent(`file-data-stream-${file.name}`);
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    setTxModalOpen(true);
    setTxStep("SIGNATURE_REQUIRED");

    // Real or simulated testnet transaction broadcast
    setTimeout(() => {
      setTxStep("PENDING");
      const mockTx = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setLastTxHash(mockTx);

      setTimeout(async () => {
        const finalHash = computedHash || (await sha256Hex(`${name}-${Date.now()}`));
        const metaHash = await sha256Hex(JSON.stringify({ name, description, type: assetType }));

        const newAsset: Asset = {
          id: `b0000000-${Date.now().toString(16).padStart(12, "0")}`,
          creatorId: address || "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          name,
          description,
          type: assetType,
          contentHash: toBytes32(finalHash),
          metadataHash: toBytes32(metaHash),
          status: "MONITORING",
          blockchainAssetId: String(assets.length + 1),
          registrationTxHash: mockTx,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          licensePolicy: {
            suggestedPriceWei: (parseFloat(suggestedPrice) * 1e18).toString(),
            standardDurationSeconds: 2592000,
            commercialAllowed: true,
            derivativesAllowed: false,
          },
          versions: [
            {
              id: `v1-${Date.now()}`,
              assetId: `b0000000-${Date.now().toString(16).padStart(12, "0")}`,
              versionNumber: 1,
              contentHash: toBytes32(finalHash),
              metadataHash: toBytes32(metaHash),
              createdAt: new Date().toISOString(),
              changelog: "Initial registration on LicenseHunterRegistry",
            },
          ],
        };

        store.registerAsset(newAsset, mockTx);
        setTxStep("CONFIRMED");

        // Reset form
        setName("");
        setDescription("");
        setComputedHash("");
        setIsRegistering(false);
      }, 1800);
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <LegalDisclaimer />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Registered IP Assets
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Anchored cryptographic provenance records stored on EVM smart contracts.
          </p>
        </div>

        <Button
          onClick={() => setIsRegistering(!isRegistering)}
          variant={isRegistering ? "secondary" : "primary"}
          size="sm"
          className="gap-2"
        >
          {isRegistering ? "Cancel Registration" : <><Plus className="w-4 h-4" /> Register New Asset</>}
        </Button>
      </div>

      {/* Registration Form Accordion */}
      {isRegistering && (
        <Card className="border-brandCyan/40 bg-surface/95 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-surfaceBorder">
            <Shield className="w-5 h-5 text-brandCyan" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Cryptographic Asset Registration (LicenseHunterRegistry.sol)
            </h3>
          </div>

          <form onSubmit={handleRegisterAsset} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Asset Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cybernetic Horizon #002"
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brandCyan"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Asset Category
                </label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as AssetType)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
                >
                  <option value="ARTWORK">ARTWORK</option>
                  <option value="IMAGE">IMAGE</option>
                  <option value="MUSIC">MUSIC</option>
                  <option value="VIDEO">VIDEO</option>
                  <option value="DOCUMENT">DOCUMENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Description &amp; Provenance Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the creation, licensing intent, and authorized scopes..."
                className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brandCyan"
              />
            </div>

            {/* File Upload & Client-side SHA-256 computation */}
            <div className="p-4 bg-black/40 border border-dashed border-slate-700 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <Upload className="w-4 h-4 text-brandCyan" />
                    <span>Upload Digital Media (Client-Side SHA-256)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    The file remains 100% private. Only the cryptographic hash (bytes32) is sent to the blockchain.
                  </p>
                </div>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-brandCyan/20 file:text-brandCyan hover:file:bg-brandCyan/30 cursor-pointer"
                />
              </div>

              {computedHash && (
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Computed SHA-256:
                  </span>
                  <HashDisplay hash={computedHash} truncate={false} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Suggested Micro-License Price (ETH)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={suggestedPrice}
                  onChange={(e) => setSuggestedPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-surfaceBorder flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsRegistering(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="gap-2">
                <Shield className="w-4 h-4" /> Broadcast Registration Tx
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Asset List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {assets.map((asset) => (
          <Card key={asset.id} className="p-5 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-surfaceBorder text-slate-300 uppercase">
                  {asset.type}
                </span>
                <StatusPill status={asset.status} />
              </div>

              <div>
                <h4 className="text-lg font-bold text-white tracking-tight">
                  {asset.name}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {asset.description}
                </p>
              </div>

              <div className="pt-2 border-t border-surfaceBorder/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-mono">Content Hash:</span>
                  <HashDisplay hash={asset.contentHash} truncate={true} />
                </div>
                {asset.registrationTxHash && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-mono">On-Chain Tx:</span>
                    <HashDisplay
                      hash={asset.registrationTxHash}
                      explorerUrl={`https://sepolia.etherscan.io/tx/${asset.registrationTxHash}`}
                      truncate={true}
                    />
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                  <span>Versions: {asset.versions?.length || 1}</span>
                  <span>Registered: {new Date(asset.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-surfaceBorder flex items-center justify-between">
              <Link href={`/assets/${asset.id}`} className="w-full">
                <Button variant="secondary" size="sm" className="w-full justify-between">
                  <span>View Provenance &amp; Scan</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        step={txStep}
        title="Register Digital Asset on EVM Registry"
        txHash={lastTxHash}
      />
    </div>
  );
}
