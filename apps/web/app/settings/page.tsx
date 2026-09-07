"use client";

import React, { useState } from "react";
import { Settings, Shield, Globe, Cpu, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function SettingsPage() {
  const [network, setNetwork] = useState("sepolia");
  const [detectionMode, setDetectionMode] = useState("DEMO");
  const [customRpc, setCustomRpc] = useState("https://rpc.sepolia.org");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-4">
      <LegalDisclaimer />

      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Protocol &amp; Network Settings
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure EVM testnet connection endpoints and detection provider options.
        </p>
      </div>

      <Card className="p-6 space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-surfaceBorder text-xs font-mono uppercase font-bold text-white">
              <Globe className="w-4 h-4 text-brandCyan" /> Blockchain Network
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Active EVM Chain
              </label>
              <select
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan"
              >
                <option value="sepolia">Sepolia Testnet (Chain ID: 11155111)</option>
                <option value="base-sepolia">Base Sepolia (Chain ID: 84532)</option>
                <option value="arbitrum-sepolia">Arbitrum Sepolia (Chain ID: 421614)</option>
                <option value="localhost">Local Anvil / Genlayer Studio EVM (Chain ID: 31337)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Custom RPC Endpoint
              </label>
              <input
                type="text"
                value={customRpc}
                onChange={(e) => setCustomRpc(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-black/50 border border-surfaceBorder rounded-lg text-sm text-white focus:outline-none focus:border-brandCyan font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-surfaceBorder">
            <div className="flex items-center gap-2 pb-2 border-b border-surfaceBorder text-xs font-mono uppercase font-bold text-white">
              <Cpu className="w-4 h-4 text-violet-400" /> Detection Provider
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                Detection Engine Mode
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDetectionMode("DEMO")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    detectionMode === "DEMO"
                      ? "border-brandCyan bg-brandCyan/10 text-white"
                      : "border-surfaceBorder bg-black/40 text-slate-400"
                  }`}
                >
                  <span className="text-xs font-bold block">DEMO Provider</span>
                  <span className="text-[11px] text-slate-400">
                    Seeded high-similarity investor demo matching.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDetectionMode("LIVE")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    detectionMode === "LIVE"
                      ? "border-brandCyan bg-brandCyan/10 text-white"
                      : "border-surfaceBorder bg-black/40 text-slate-400"
                  }`}
                >
                  <span className="text-xs font-bold block">LIVE Cryptographic</span>
                  <span className="text-[11px] text-slate-400">
                    Bitwise SHA-256 and exact content hash matching.
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-surfaceBorder flex items-center justify-between">
            {saved ? (
              <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-mono">
                <CheckCircle2 className="w-4 h-4" /> Settings updated successfully
              </span>
            ) : <span />}

            <Button type="submit" size="sm">
              Save Settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
