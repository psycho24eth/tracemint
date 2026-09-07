"use client";

import React from "react";
import { Shield, Lock, Terminal, FileCode, CheckCircle2, BookOpen } from "lucide-react";
import { Card } from "@/components/Card";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <LegalDisclaimer />

      <div>
        <div className="flex items-center gap-2 text-xs font-mono text-brandCyan uppercase font-bold tracking-wider mb-2">
          <BookOpen className="w-4 h-4" /> Technical Documentation
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          LicenseHunter Protocol Specifications
        </h1>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Smart contract architecture, cryptographic verification standards, and settlement mechanics.
        </p>
      </div>

      {/* Contract Architecture */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <FileCode className="w-4 h-4 text-brandCyan" />
          Core Smart Contracts
        </h3>

        <div className="space-y-4 text-xs font-mono">
          <div className="p-4 bg-black/50 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-white font-bold">
              <span>LicenseHunterRegistry.sol</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-brandCyan/20 text-brandCyan">EVM Registry</span>
            </div>
            <p className="text-slate-400 font-sans text-xs">
              Registers original digital IP assets with SHA-256 content hashes (bytes32), maintains multi-version provenance histories, and anchors tamper-proof evidence records.
            </p>
          </div>

          <div className="p-4 bg-black/50 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-white font-bold">
              <span>LicenseHunterLicensing.sol</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-violet-500/20 text-violet-300">Licensing Engine</span>
            </div>
            <p className="text-slate-400 font-sans text-xs">
              Creates programmable micro-license offers, validates exact testnet payment, issues active license certificates, splits fees (97% creator / 3% protocol), and enables nonReentrant pull-based withdrawals.
            </p>
          </div>

          <div className="p-4 bg-black/50 border border-slate-800 rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-white font-bold">
              <span>LicenseHunterTreasury.sol</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Treasury Vault</span>
            </div>
            <p className="text-slate-400 font-sans text-xs">
              Segregated protocol treasury for operational revenue, role-gated with TREASURY_ADMIN_ROLE and isolated from creator funds.
            </p>
          </div>
        </div>
      </Card>

      {/* Security & Access Controls */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          Security Invariants
        </h3>

        <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
          <li><strong>Pull-Based Accounting:</strong> Creator revenue is recorded in internal ledger mappings. Creators pull their earnings via <code className="text-brandCyan font-mono">withdrawCreatorRevenue()</code> rather than pushing payments during purchase.</li>
          <li><strong>Reentrancy Resistance:</strong> All state updates occur before external ETH transfers with OpenZeppelin <code className="text-brandCyan font-mono">nonReentrant</code> modifiers.</li>
          <li><strong>No Arbitrary URL Fetching (SSRF Protection):</strong> User-submitted URLs are strictly sanitized to prevent local network scanning and cloud metadata access.</li>
          <li><strong>Deterministic Evidence Serialization:</strong> Evidence snapshots are canonically sorted and hashed before on-chain anchoring.</li>
        </ul>
      </Card>

      {/* Foundry Test Verification */}
      <Card className="p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-400" />
          Local Verification &amp; Foundry Commands
        </h3>

        <div className="p-4 bg-black/60 border border-slate-800 rounded-lg font-mono text-xs text-slate-300 space-y-2">
          <div className="text-slate-500"># Run complete unit and property-based fuzz test suite:</div>
          <div className="text-brandCyan">npm run contracts:test</div>
          <div className="text-slate-500 pt-2"># Build Next.js application:</div>
          <div className="text-brandCyan">npm run build</div>
          <div className="text-slate-500 pt-2"># Deploy smart contracts to EVM testnet:</div>
          <div className="text-brandCyan">forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast</div>
        </div>
      </Card>
    </div>
  );
}
