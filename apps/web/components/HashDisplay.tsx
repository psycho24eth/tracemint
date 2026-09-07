"use client";

import React, { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { truncateAddress } from "@licensehunter/shared";

interface HashDisplayProps {
  hash: string;
  label?: string;
  truncate?: boolean;
  explorerUrl?: string;
}

export const HashDisplay: React.FC<HashDisplayProps> = ({
  hash,
  label,
  truncate = true,
  explorerUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const display = truncate ? truncateAddress(hash, 6) : hash;

  return (
    <div className="inline-flex items-center gap-2 bg-black/40 border border-slate-800 rounded px-2.5 py-1 text-xs font-mono text-slate-300">
      {label && <span className="text-slate-500 font-sans">{label}:</span>}
      <span>{display}</span>
      <button
        onClick={handleCopy}
        className="text-slate-400 hover:text-brandCyan transition-colors"
        title="Copy Hash"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
      {explorerUrl && (
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-brandCyan transition-colors"
          title="View in Block Explorer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  );
};
