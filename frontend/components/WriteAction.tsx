"use client";

import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { TestGenButton } from "@/components/wallet/TestGenButton";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, roleForMethod, type DemoRole } from "@/lib/demo/roles";
import { FAUCET_CEILING_WEI } from "@/lib/faucet";
import { formatGen, txLink } from "@/lib/format";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGenBalance } from "@/lib/hooks/useGenBalance";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import { outcomeMessage, STILL_WAITING_MESSAGE, submitDemoWrite, UNDECIDED_MESSAGE, waitForDemoTx } from "@/lib/tx";

type Phase =
  | { name: "idle" }
  | { name: "submitting" }
  | { name: "pending"; hash: string }
  | { name: "switching" }
  | { name: "wallet" }
  | { name: "done"; hash?: string }
  | { name: "failed"; message: string; hash?: string };

export type WriteActionProps = {
  method: string;
  args: unknown[];
  label: string;
  value?: bigint;
  disabled?: boolean;
  /** Runs first when the button is pressed; return false to stop, for example when a form is invalid. */
  onBeforeSubmit?: () => boolean;
  onSuccess?: () => void;
  variant?: "default" | "outline" | "secondary";
};

// The Transaction Kit submits fees without message allocations, and Studio Next rejects payout messages
// without them (docs/platform-checks.md), so payouts run through the demo creator role for now.
const WALLET_BLOCKED_METHODS = new Set(["withdraw_earnings", "withdraw_protocol_fees"]);

function blockedReason(options: {
  contractAddress: string;
  method: string;
  role: DemoRole | null;
  requiredRole: DemoRole | null;
  address: string | null;
  hasKit: boolean;
}): string | null {
  if (!options.contractAddress) return "Set NEXT_PUBLIC_CONTRACT_ADDRESS to enable this action.";
  if (options.role) {
    if (options.requiredRole === options.role) return null;
    return options.requiredRole
      ? `Switch to the ${DEMO_ROLE_LABELS[options.requiredRole].toLowerCase()} role to do this.`
      : "Exit demo mode to use your wallet for this.";
  }
  if (WALLET_BLOCKED_METHODS.has(options.method)) {
    return "Withdrawing from a connected wallet isn't supported on Studio Next yet: payouts need a message fee allocation that wallet signing can't send.";
  }
  // No wallet yet is not a dead end: the button opens the wallet picker instead.
  if (options.address && !options.hasKit) return "Your wallet is not ready. Reconnect it and try again.";
  return null;
}

/** The wallet's GEN next to the fee quote, with test GEN a click away when it runs low. */
function WalletFunds({ address, balance, value }: { address: string; balance?: bigint; value?: bigint }) {
  if (balance === undefined) return null;
  const short = value !== undefined && balance < value;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-line px-3 py-2 text-xs">
      <p>
        <span className="t-label mr-2">Wallet balance</span>
        <span className={short ? "text-signal" : undefined}>{formatGen(balance, 2)}</span>
        {short && <span className="text-signal"> · not enough to send {formatGen(value, 2)} plus fees</span>}
      </p>
      {balance < FAUCET_CEILING_WEI && <TestGenButton address={address} variant={short || balance === 0n ? "default" : "outline"} />}
    </div>
  );
}

function TxLink({ hash }: { hash?: string }) {
  if (!hash) return null;
  return (
    <a href={txLink(hash)} target="_blank" rel="noreferrer" className="t-link">
      View transaction
    </a>
  );
}

export function WriteAction({
  method,
  args,
  label,
  value,
  disabled,
  onBeforeSubmit,
  onSuccess,
  variant = "default",
}: WriteActionProps) {
  const { role, accessCode } = useDemoMode();
  const { address, provider, isOnCorrectNetwork, openModal, switchNetwork } = useWallet();
  const kit = useTransactionKit(address, provider);
  const balance = useGenBalance(role ? null : address);
  const refresh = useRefreshLicenseHunter();
  const contractAddress = getContractAddress();
  const [phase, setPhase] = useState<Phase>({ name: "idle" });

  // The panel re-estimates fees whenever the tx object changes, so its identity must stay stable across renders.
  const argsKey = JSON.stringify(args, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
  const tx = useMemo<SubmitInput>(
    () => ({ kind: "write", address: contractAddress as `0x${string}`, method, args }),
    [contractAddress, method, argsKey],
  );

  const reason = blockedReason({
    contractAddress,
    method,
    role,
    requiredRole: roleForMethod(method),
    address,
    hasKit: kit !== null,
  });
  const busy = phase.name === "submitting" || phase.name === "pending" || phase.name === "switching";
  const needsWallet = !role && !address;

  function succeed(hash?: string) {
    setPhase({ name: "done", hash });
    void refresh();
    onSuccess?.();
  }

  async function runDemoWrite(demoRole: DemoRole) {
    setPhase({ name: "submitting" });
    let hash: string | undefined;
    try {
      hash = await submitDemoWrite({ role: demoRole, method, args, value, accessCode: accessCode ?? undefined });
      setPhase({ name: "pending", hash });
      const status = await waitForDemoTx(hash);
      if (status.successful) {
        succeed(hash);
        return;
      }
      const message = status.decided ? (outcomeMessage(status) ?? UNDECIDED_MESSAGE) : STILL_WAITING_MESSAGE;
      setPhase({ name: "failed", message, hash });
    } catch (error) {
      setPhase({ name: "failed", message: (error as Error).message, hash });
    }
  }

  async function start() {
    if (onBeforeSubmit && !onBeforeSubmit()) return;
    if (role) {
      void runDemoWrite(role);
      return;
    }
    if (!address) {
      openModal("connect");
      return;
    }
    if (!isOnCorrectNetwork) {
      setPhase({ name: "switching" });
      if (!(await switchNetwork())) {
        setPhase({ name: "failed", message: `Your wallet is still on another network. Switch to ${GENLAYER_NETWORK.chainName} and try again.` });
        return;
      }
    }
    setPhase({ name: "wallet" });
  }

  function handleWalletDone(status: TrackedStatus) {
    if (status.successful !== false) {
      succeed(status.genlayerTxId);
      return;
    }
    const message = status.statusName === "UNDETERMINED" ? UNDECIDED_MESSAGE : "The transaction did not succeed.";
    setPhase({ name: "failed", message, hash: status.genlayerTxId });
  }

  return (
    <div className="space-y-2">
      {phase.name === "wallet" && kit && address ? (
        <div className="space-y-2">
          <WalletFunds address={address} balance={balance.data} value={value} />
          <GenLayerTransactionPanel
            kit={kit}
            tx={tx}
            userValue={value}
            network={GENLAYER_NETWORK.chainName}
            theme="dark"
            trackUntil="decided"
            onDone={handleWalletDone}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => setPhase({ name: "idle" })}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant={variant} disabled={Boolean(disabled || reason || busy)} onClick={() => void start()}>
          {phase.name === "submitting"
            ? "Submitting…"
            : phase.name === "pending"
              ? "Waiting for validators…"
              : phase.name === "switching"
                ? "Switching network…"
                : label}
        </Button>
      )}
      {reason && <p className="text-xs text-muted-foreground">{reason}</p>}
      {!reason && needsWallet && <p className="text-xs text-muted-foreground">Connect a wallet to continue.</p>}
      {phase.name === "pending" && (
        <p role="status" className="text-xs text-muted-foreground">
          Submitted. Validators usually decide within 1–2 minutes. <TxLink hash={phase.hash} />
        </p>
      )}
      {phase.name === "done" && (
        <p role="status" className="text-xs text-mint">
          Done. <TxLink hash={phase.hash} />
        </p>
      )}
      {phase.name === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {phase.message} <TxLink hash={phase.hash} />
        </p>
      )}
    </div>
  );
}
