"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Shield, Sparkles, Wallet, LogOut, CheckCircle2, ChevronDown } from "lucide-react";
import { truncateAddress } from "@licensehunter/shared";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/assets", label: "Registered IP" },
    { href: "/detections", label: "Detections" },
    { href: "/licenses", label: "Licenses" },
    { href: "/payments", label: "Royalties" },
    { href: "/docs", label: "Protocol Specs" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-surfaceBorder bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brandCyan to-brandViolet flex items-center justify-center shadow-lg shadow-brandCyan/20">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              LICENSEHUNTER
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-brandCyan/20 text-brandCyan border border-brandCyan/40 uppercase font-mono">
                Testnet
              </span>
            </span>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">
              IP Micro-Licensing Engine
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all ${
                  isActive
                    ? "bg-surfaceBorder text-brandCyan border border-brandCyan/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-surface/60"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Controls & Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-surface border border-surfaceBorder rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-mono">
                {chain?.name || "Sepolia Testnet"}
              </span>
            </div>
          )}

          {isConnected ? (
            <div className="flex items-center gap-2 bg-surface/90 border border-brandCyan/30 rounded-lg p-1">
              <div className="px-2.5 py-1 text-xs font-mono text-white font-semibold">
                {truncateAddress(address, 4)}
              </div>
              <button
                onClick={() => disconnect()}
                className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                title="Disconnect Wallet"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const connector = connectors[0];
                if (connector) connect({ connector });
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-brandCyan to-brandViolet text-black font-bold text-xs uppercase tracking-wider rounded-lg hover:brightness-110 shadow-lg shadow-brandCyan/10 transition-all"
            >
              <Wallet className="w-3.5 h-3.5" />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
