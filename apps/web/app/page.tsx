"use client";

import React from "react";
import Link from "next/link";
import {
  Shield,
  Zap,
  Lock,
  ArrowRight,
  Search,
  FileCheck2,
  Coins,
  Scale,
  Sparkles,
  Layers,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";

export default function LandingPage() {
  const pipelineSteps = [
    { step: "01", name: "SOURCE", desc: "Creator registers original IP asset with off-chain SHA-256 hash" },
    { step: "02", name: "DETECT", desc: "Automated scan discovers potential unauthorized digital matches" },
    { step: "03", name: "VERIFY", desc: "Deterministic evidence snapshot created & anchored on-chain" },
    { step: "04", name: "OFFER", desc: "Creator configures micro-license fee & commercial rights" },
    { step: "05", name: "SETTLE", desc: "Instant 1-click testnet payment settles & activates license" },
  ];

  const roadmapPhases = [
    { phase: "PHASE 1", title: "Evidence & On-Chain Licensing", status: "CURRENT MVP", desc: "EVM registry, bytes32 evidence anchoring, pull-based royalty settlement." },
    { phase: "PHASE 2", title: "Automated Discovery Network", status: "PLANNED", desc: "Autonomous decentralized crawlers and perceptual perceptual hashing." },
    { phase: "PHASE 3", title: "Agentic IP Negotiation", status: "PLANNED", desc: "Autonomous AI agents negotiating dynamic fair-market license pricing." },
    { phase: "PHASE 4", title: "Cross-Platform Monitoring", status: "PLANNED", desc: "Multi-chain and decentralized storage (Arweave / IPFS / Filecoin) monitoring." },
    { phase: "PHASE 5", title: "Enterprise IP Infrastructure", status: "FUTURE", desc: "Institutional compliance pipelines, corporate treasury integrations." },
  ];

  return (
    <div className="space-y-24 py-6">
      {/* Disclaimer Top */}
      <LegalDisclaimer />

      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto pt-8 pb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brandCyan/10 border border-brandCyan/30 text-brandCyan text-xs font-mono mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>EVM Public Testnet MVP &bull; Smart Contracts Verified</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Turn IP Infringement <br />
          <span className="bg-gradient-to-r from-brandCyan via-white to-brandViolet bg-clip-text text-transparent">
            Into Instant Licensing.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The internet moves faster than traditional legal notices. LicenseHunter detects potential unauthorized digital usage, creates tamper-proof cryptographic evidence, and settles programmable micro-licenses on-chain in seconds.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg" className="w-full sm:w-auto gap-2">
              Launch LicenseHunter <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/detections">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Explore Demo Detections
            </Button>
          </Link>
        </div>

        {/* Core Loop Visual */}
        <div className="mt-16 pt-10 border-t border-surfaceBorder">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-left">
            {pipelineSteps.map((item, i) => (
              <div
                key={i}
                className="bg-surface/60 border border-surfaceBorder rounded-lg p-4 hover:border-brandCyan/40 transition-all relative group"
              >
                <div className="text-[10px] font-mono text-brandCyan font-bold mb-1">
                  {item.step}
                </div>
                <div className="text-sm font-bold text-white tracking-wide">
                  {item.name}
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {item.desc}
                </p>
                {i < pipelineSteps.length - 1 && (
                  <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-slate-600">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Thesis / Problem & Solution */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        <Card className="flex flex-col justify-between border-rose-900/30 bg-rose-950/10">
          <div>
            <div className="inline-flex items-center gap-2 text-rose-400 text-xs font-mono font-bold uppercase mb-3">
              <Scale className="w-4 h-4" /> The Broken Traditional Model
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Slow, Expensive & Adversarial
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed space-y-2">
              Today, when creator IP is copied online or remixed by AI agents, creators must hire counsel, send legal cease-and-desist notices, and wait months for replies. Infringers usually just delete the post without paying a single dollar.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-rose-900/40 text-xs font-mono text-rose-400/80">
            Result: 99% of unauthorized digital usage remains completely unmonetized.
          </div>
        </Card>

        <Card className="flex flex-col justify-between border-brandCyan/30 bg-surface">
          <div>
            <div className="inline-flex items-center gap-2 text-brandCyan text-xs font-mono font-bold uppercase mb-3">
              <Zap className="w-4 h-4" /> The Machine-Readable Model
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Frictionless Instant Micro-Licensing
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              LicenseHunter transforms infringement detection into a commercial opportunity. Infringers are presented with immutable cryptographic evidence and an instant 1-click on-chain payment link to legitimize their usage under clear terms.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-brandCyan/30 text-xs font-mono text-emerald-400">
            Result: Instant revenue for creators; zero litigation friction for publishers.
          </div>
        </Card>
      </section>

      {/* Core Protocol Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Engineered for Cryptographic Certainty
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Built strictly adhering to verifiable on-chain invariants and secure pull-based treasury patterns.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="hover:border-brandCyan/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-brandCyan/10 border border-brandCyan/30 flex items-center justify-center text-brandCyan mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Cryptographic Evidence
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Media files are hashed client-side with SHA-256. Evidence snapshots are deterministically serialized and anchored as immutable bytes32 records in the smart contract registry.
            </p>
          </Card>

          <Card className="hover:border-violet-500/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-4">
              <Coins className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Pull-Based Royalties
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Revenue is strictly accounted in internal contract balances with nonReentrant safety. Creators pull their earnings directly without intermediary custodian risk.
            </p>
          </Card>

          <Card className="hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Verifiable Certificates
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Purchasing a license issues an on-chain tokenized license certificate containing terms hash, timestamp, licensee wallet, and validity period.
            </p>
          </Card>
        </div>
      </section>

      {/* Protocol Roadmap */}
      <section className="pt-8 border-t border-surfaceBorder space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-mono text-brandCyan uppercase tracking-wider font-bold">
              Engineering Milestones
            </div>
            <h2 className="text-2xl font-bold text-white mt-1">Product Roadmap</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            Phased Architecture &amp; Scalability
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {roadmapPhases.map((phase, idx) => (
            <Card
              key={idx}
              className={`p-4 ${
                phase.status === "CURRENT MVP"
                  ? "border-brandCyan/40 bg-brandCyan/5"
                  : "border-surfaceBorder opacity-70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-400">
                  {phase.phase}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    phase.status === "CURRENT MVP"
                      ? "bg-brandCyan/20 text-brandCyan border border-brandCyan/40"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {phase.status}
                </span>
              </div>
              <h5 className="text-xs font-bold text-white mb-1">{phase.title}</h5>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {phase.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
