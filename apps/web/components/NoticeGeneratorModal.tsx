"use client";

import React, { useState } from "react";
import { X, FileText, Copy, Check, Download } from "lucide-react";
import { Button } from "./Button";
import { LegalDisclaimer } from "./LegalDisclaimer";

interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetName: string;
  matchedUrl: string;
  contentHash: string;
  similarityScore: number;
  offerLink: string;
}

export const NoticeGeneratorModal: React.FC<NoticeModalProps> = ({
  isOpen,
  onClose,
  assetName,
  matchedUrl,
  contentHash,
  similarityScore,
  offerLink,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const noticeText = `============================================================
NOTICE OF POTENTIAL UNAUTHORIZED USAGE & SETTLEMENT OFFER
============================================================
DEMO DOCUMENT — NOT LEGAL ADVICE OR LEGALLY SERVED NOTICE.

DATE: ${new Date().toUTCString()}
REGISTRY: LicenseHunter EVM Protocol

1. IDENTIFIED WORK
Asset Name: "${assetName}"
Cryptographic Hash: ${contentHash}
Provenance: Registered on-chain via LicenseHunterRegistry.sol

2. DETECTED USAGE
Observed Location: ${matchedUrl}
Structural Similarity: ${similarityScore}%
Timestamp: ${new Date().toISOString()}

3. SUGGESTED RESOLUTION VIA PROGRAMMABLE LICENSING
The owner of the registered asset has generated a machine-verifiable micro-license offer to grant authorized digital publication rights immediately.

Accept and activate license on-chain:
${offerLink}

4. IMPORTANT DISCLAIMER
This document is automatically generated as part of a demonstration workflow. It does not constitute formal legal service, legal advice, or a formal legal demand. Legal decisions remain outside the automated system.
============================================================`;

  const handleCopy = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-surface border border-surfaceBorder rounded-xl p-6 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-surfaceBorder">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brandCyan" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Settlement Notice Document
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="my-4">
          <LegalDisclaimer />
        </div>

        <div className="flex-1 overflow-y-auto bg-black/60 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {noticeText}
        </div>

        <div className="mt-4 pt-3 border-t border-surfaceBorder flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            Integrity: Deterministic Canonical Formatting
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-1 text-emerald-400" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "Copied" : "Copy Notice"}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
