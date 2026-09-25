"use client";

import { GenLayerTransactionPanel, type SubmitInput, type TrackedStatus } from "@genlayer/transaction-kit-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { ValidatorTimer, type Settled, type Verdict } from "@/components/ValidatorTimer";
import { TestGenButton } from "@/components/wallet/TestGenButton";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, roleForMethod, type DemoRole } from "@/lib/demo/roles";
import { FAUCET_CEILING_WEI } from "@/lib/faucet";
import { formatGen, txLink } from "@/lib/format";
import { GENLAYER_NETWORK, getContractAddress } from "@/lib/genlayer/client";
import { NETWORK_SHORT_NAME } from "@/lib/genlayer/connection";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { useGenBalance } from "@/lib/hooks/useGenBalance";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import {
  outcomeMessage,
  STILL_WAITING_MESSAGE,
  submitDemoWrite,
  UNDECIDED_MESSAGE,
  waitForDemoTx,
  walletOutcomeMessage,
} from "@/lib/tx";
import { advance, FIRST_ROUND, type Progress } from "@/lib/validator-stages";

type Phase =
  | { name: "idle" }
  | { name: "submitting" }
  | { name: "pending"; hash: string }
  | { name: "switching" }
  | { name: "wallet" }
  | { name: "done"; hash?: string }
  | { name: "failed"; message: string; hash?: string };

/** The clock and consensus progress for the transaction on screen, from the first status to the decision. */
type Run = { startedAt: number; progress: Progress; settled?: Settled };

export type WriteActionProps = {
  method: string;
  args: unknown[];
  label: string;
  value?: bigint;
  disabled?: boolean;
  /** Why this action cannot run, when the caller knows something the component cannot work out itself. */
  unavailable?: string | null;
  /** Runs first when the button is pressed; return false to stop, for example when a form is invalid. */
  onBeforeSubmit?: () => boolean;
  /** Receives the transaction hash, so a caller can point at what the write produced. */
  onSuccess?: (hash?: string) => void;
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
        <span className="t-label mr-2">{NETWORK_SHORT_NAME} balance</span>
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
  unavailable,
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
  const [run, setRun] = useState<Run | null>(null);

  const noteStatus = (statusName: string | undefined) =>
    setRun((previous) => {
      const current = previous ?? { startedAt: Date.now(), progress: FIRST_ROUND };
      return { ...current, progress: advance(current.progress, statusName) };
    });
  const freeze = (verdict: Verdict) =>
    setRun((previous) => (previous ? { ...previous, settled: { at: Date.now(), verdict } } : previous));

  // The panel re-estimates fees whenever the tx object changes, so its identity must stay stable across renders.
  const argsKey = JSON.stringify(args, (_key, item) => (typeof item === "bigint" ? item.toString() : item));
  const tx = useMemo<SubmitInput>(
    () => ({ kind: "write", address: contractAddress as `0x${string}`, method, args }),
    [contractAddress, method, argsKey],
  );

  // The panel's timeline names the steps but never says how long they have taken, so its status updates
  // feed the clock next to it. createTransactionKit returns a plain object, so overriding one method is safe.
  const tracked = useMemo(
    () =>
      kit &&
      ({
        ...kit,
        track: (id: `0x${string}`, onUpdate: (status: TrackedStatus) => void, options?: { until?: "decided" | "finalized" }) =>
          kit.track(
            id,
            (status) => {
              noteStatus(status.statusName);
              onUpdate(status);
            },
            options,
          ),
      } satisfies typeof kit),
    [kit],
  );

  const reason =
    unavailable ??
    blockedReason({
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
    onSuccess?.(hash);
  }

  async function runDemoWrite(demoRole: DemoRole) {
    setPhase({ name: "submitting" });
    setRun({ startedAt: Date.now(), progress: FIRST_ROUND });
    let hash: string | undefined;
    try {
      hash = await submitDemoWrite({ role: demoRole, method, args, value, accessCode: accessCode ?? undefined });
      setPhase({ name: "pending", hash });
      const status = await waitForDemoTx(hash, { onStatus: (update) => noteStatus(update.status) });
      freeze(!status.decided ? "unknown" : status.successful ? "accepted" : "problem");
      if (status.successful) {
        succeed(hash);
        return;
      }
      const message = status.decided ? (outcomeMessage(status) ?? UNDECIDED_MESSAGE) : STILL_WAITING_MESSAGE;
      setPhase({ name: "failed", message, hash });
    } catch (error) {
      freeze("unknown");
      setPhase({ name: "failed", message: (error as Error).message, hash });
    }
  }

  async function start() {
    if (onBeforeSubmit && !onBeforeSubmit()) return;
    setRun(null);
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
    freeze(status.successful !== false ? "accepted" : "problem");
    if (status.successful !== false) {
      succeed(status.genlayerTxId);
      return;
    }
    setPhase({ name: "failed", message: walletOutcomeMessage(status), hash: status.genlayerTxId });
  }

  return (
    <div className="space-y-2">
      {phase.name === "wallet" && tracked && address ? (
        <div className="space-y-2">
          <WalletFunds address={address} balance={balance.data} value={value} />
          <GenLayerTransactionPanel
            kit={tracked}
            tx={tx}
            userValue={value}
            network={GENLAYER_NETWORK.chainName}
            theme="dark"
            trackUntil="decided"
            onDone={handleWalletDone}
          />
          {run && <ValidatorTimer startedAt={run.startedAt} progress={run.progress} settled={run.settled} compact />}
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
      {run && !run.settled && (phase.name === "submitting" || phase.name === "pending") && (
        <ValidatorTimer startedAt={run.startedAt} progress={run.progress}>
          {phase.name === "pending" ? <TxLink hash={phase.hash} /> : null}
        </ValidatorTimer>
      )}
      {run?.settled && (phase.name === "done" || phase.name === "failed") && (
        <ValidatorTimer startedAt={run.startedAt} progress={run.progress} settled={run.settled} compact />
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
