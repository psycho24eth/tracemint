"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink, X } from "lucide-react";
import { Button } from "./Button";
import { HashDisplay } from "./HashDisplay";

export type TxStep =
  | "IDLE"
  | "WALLET_REQUIRED"
  | "SIGNATURE_REQUIRED"
  | "SUBMITTED"
  | "PENDING"
  | "CONFIRMED"
  | "FAILED";

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  step: TxStep;
  txHash?: string;
  errorMessage?: string;
  title: string;
  onRetry?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  step,
  txHash,
  errorMessage,
  title,
  onRetry,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-surface border border-surfaceBorder rounded-xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-bold text-white uppercase tracking-wider mb-4">
          {title}
        </h3>

        {/* State Machine Renderer */}
        <div className="py-6 flex flex-col items-center text-center">
          {step === "WALLET_REQUIRED" && (
            <>
              <div className="w-12 h-12 rounded-full bg-brandCyan/20 flex items-center justify-center mb-3">
                <Loader2 className="w-6 h-6 text-brandCyan animate-spin" />
              </div>
              <h4 className="font-semibold text-white">Wallet Connection Required</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Please connect your EVM testnet wallet to sign and broadcast this operation.
              </p>
            </>
          )}

          {step === "SIGNATURE_REQUIRED" && (
            <>
              <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center mb-3">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
              <h4 className="font-semibold text-white">Signature Requested</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Confirm the transaction parameters inside your wallet prompt.
              </p>
            </>
          )}

          {step === "PENDING" && (
            <>
              <div className="w-12 h-12 rounded-full bg-brandCyan/20 flex items-center justify-center mb-3">
                <Loader2 className="w-6 h-6 text-brandCyan animate-spin" />
              </div>
              <h4 className="font-semibold text-white">Awaiting Block Confirmation</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Transaction submitted to EVM testnet. Waiting for validator receipt.
              </p>
              {txHash && (
                <div className="mt-4">
                  <HashDisplay hash={txHash} label="Tx" truncate={true} />
                </div>
              )}
            </>
          )}

          {step === "CONFIRMED" && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="font-semibold text-white">Transaction Confirmed</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                On-chain state synchronized successfully with protocol smart contracts.
              </p>
              {txHash && (
                <div className="mt-4">
                  <HashDisplay
                    hash={txHash}
                    label="Tx"
                    explorerUrl={`https://sepolia.etherscan.io/tx/${txHash}`}
                  />
                </div>
              )}
              <Button variant="outline" size="sm" onClick={onClose} className="mt-6">
                Done
              </Button>
            </>
          )}

          {step === "FAILED" && (
            <>
              <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h4 className="font-semibold text-rose-300">Transaction Failed</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {errorMessage || "The transaction reverted or was rejected by user."}
              </p>
              {onRetry && (
                <Button variant="primary" size="sm" onClick={onRetry} className="mt-6">
                  Retry Transaction
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
