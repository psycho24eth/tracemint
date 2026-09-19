"use client";

import { Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/lib/genlayer/wallet";
import { cn } from "@/lib/utils";

import { WalletIcon } from "./WalletIcon";

/** The navbar's wallet control: connect, or the connected account with its network state. */
export function WalletButton() {
  const { isRestoring, isConnected, isOnCorrectNetwork, address, wallet, openModal } = useWallet();

  // Holds the button's place while a returning visitor's wallet reconnects, so the bar doesn't jump.
  if (isRestoring) {
    return <span aria-hidden="true" className="block h-8 w-[10.5rem] animate-pulse border border-line motion-reduce:animate-none" />;
  }

  if (!isConnected || !address) {
    return (
      <Button size="sm" onClick={() => openModal("connect")} aria-haspopup="dialog" data-tour="wallet">
        <Wallet aria-hidden="true" />
        {/* Phones share the bar with the logo and Guide, so the label shortens there. */}
        <span className="sm:hidden">Connect</span>
        <span className="hidden sm:inline">Connect wallet</span>
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openModal("account")}
      aria-haspopup="dialog"
      aria-label={`Wallet ${shortAddress(address)}, ${isOnCorrectNetwork ? "on GenLayer" : "on the wrong network"}`}
      data-tour="wallet"
      className={cn(
        "flex h-8 items-center gap-2 border px-2.5 text-xs transition-colors",
        isOnCorrectNetwork ? "border-line hover:border-signal" : "border-signal/70 text-signal hover:border-signal",
      )}
    >
      <WalletIcon icon={wallet?.icon} size="sm" />
      <span className="font-mono">{shortAddress(address)}</span>
      <span aria-hidden="true" className={cn("size-2 rounded-full", isOnCorrectNetwork ? "bg-mint" : "bg-signal")} />
    </button>
  );
}
