"use client";

import { Droplets, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { faucetAvailable } from "@/lib/faucet";
import { describeChain, GENLAYER_TESTNET_CHAIN_ID, NETWORK_SHORT_NAME } from "@/lib/genlayer/connection";
import { GENLAYER_CHAIN, GENLAYER_NETWORK } from "@/lib/genlayer/network";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGenBalance } from "@/lib/hooks/useGenBalance";

import { TestGenButton } from "./TestGenButton";

/**
 * A strip under the navbar for the two things that stop a connected wallet from working:
 * the wrong network, and no GEN to pay fees with.
 */
export function NetworkBanner() {
  const { isConnected, isOnCorrectNetwork, address, chainId, wallet, activity, failure, switchNetwork, openModal } = useWallet();
  const balance = useGenBalance(isConnected && isOnCorrectNetwork ? address : null);

  if (!isConnected || !address) return null;

  if (!isOnCorrectNetwork) {
    const switching = activity === "switching";
    const walletName = wallet && wallet.name !== "Browser wallet" ? wallet.name : "Your wallet";
    return (
      <div className="border-t border-signal/40 bg-signal/[0.07]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs md:px-6">
          <TriangleAlert className="size-4 shrink-0 text-signal" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            {walletName} is on {describeChain(chainId)}. TraceMint runs on {GENLAYER_NETWORK.chainName}
            {chainId === GENLAYER_TESTNET_CHAIN_ID ? ", a separate network with its own free GEN." : "."}
            {failure?.action === "switch" && (
              <>
                {" "}
                <span role="alert" className="text-signal">
                  {failure.error.kind === "rejected" ? "The switch was declined." : "The switch didn't go through."}
                </span>{" "}
                <button type="button" onClick={() => openModal("connect")} className="t-link">
                  Details
                </button>
              </>
            )}
          </p>
          <Button size="sm" onClick={() => void switchNetwork()} disabled={switching}>
            {switching && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {switching ? "Check your wallet…" : "Switch network"}
          </Button>
        </div>
      </div>
    );
  }

  if (balance.data === 0n && faucetAvailable(GENLAYER_CHAIN)) {
    return (
      <div className="border-t border-mint/30 bg-mint/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs md:px-6">
          <Droplets className="size-4 shrink-0 text-mint" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            Your wallet has no {NETWORK_SHORT_NAME} GEN yet. It pays the fees here, it&apos;s free, and it&apos;s separate from any GEN on the testnet.
          </p>
          <TestGenButton address={address} />
        </div>
      </div>
    );
  }

  return null;
}
