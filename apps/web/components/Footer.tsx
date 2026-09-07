import React from "react";
import Link from "next/link";
import { Shield } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-surfaceBorder bg-surface/40 mt-20 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-brandCyan to-brandViolet flex items-center justify-center">
              <Shield className="w-4 h-4 text-black" />
            </div>
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              LICENSEHUNTER &copy; 2026
            </span>
          </div>

          <p className="text-xs text-slate-500 max-w-xl text-center md:text-left">
            DEMO DOCUMENT — NOT LEGAL ADVICE OR LEGALLY SERVED NOTICE. LicenseHunter identifies potential unauthorized usage and provides verifiable cryptographic evidence anchoring and micro-licensing rails.
          </p>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <Link href="/docs" className="hover:text-brandCyan transition-colors">
              Docs
            </Link>
            <span>&bull;</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              EVM Testnet Live
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
