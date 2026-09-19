"use client";

import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Repeat,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { DemoAccessPanel } from "@/components/demo/DemoAccessPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FAUCET_CEILING_WEI, faucetAvailable } from "@/lib/faucet";
import { addressLink, formatGen, shortAddress } from "@/lib/format";
import { describeChain, GENLAYER_TESTNET_CHAIN_ID, NETWORK_SHORT_NAME, type WalletError } from "@/lib/genlayer/connection";
import type { DiscoveredWallet, WalletInfo } from "@/lib/genlayer/eip6963";
import { GENLAYER_CHAIN, GENLAYER_NETWORK } from "@/lib/genlayer/network";
import { useWallet } from "@/lib/genlayer/wallet";
import {
  isMobileDevice,
  RECOMMENDED_RDNS,
  WALLET_EXPLAINER_URL,
  WALLET_GUIDES,
  type WalletGuide,
} from "@/lib/genlayer/wallets";
import { useGenBalance } from "@/lib/hooks/useGenBalance";
import { cn } from "@/lib/utils";

import { CopyButton } from "./CopyButton";
import { NetworkDetails } from "./NetworkDetails";
import { TestGenButton } from "./TestGenButton";
import { WalletIcon } from "./WalletIcon";

type Wallet = ReturnType<typeof useWallet>;

type View =
  | { name: "account" }
  | { name: "picker" }
  | { name: "connecting"; wallet: DiscoveredWallet }
  | { name: "connect-failed"; wallet: DiscoveredWallet | null; error: WalletError }
  | { name: "switching" }
  | { name: "switch-failed"; error: WalletError }
  | { name: "wrong-network" }
  | { name: "ready" };

const NETWORK = GENLAYER_NETWORK.chainName;
const GEN = 10n ** 18n;

function resolveView(wallet: Wallet): View {
  if (wallet.modal.view === "account" && wallet.isConnected) return { name: "account" };
  if (wallet.activity === "connecting" && wallet.pendingWallet) return { name: "connecting", wallet: wallet.pendingWallet };
  if (wallet.activity === "switching") return { name: "switching" };
  if (wallet.failure?.action === "connect") {
    return { name: "connect-failed", wallet: wallet.pendingWallet, error: wallet.failure.error };
  }
  if (!wallet.isConnected) return { name: "picker" };
  if (wallet.failure?.action === "switch") return { name: "switch-failed", error: wallet.failure.error };
  if (!wallet.isOnCorrectNetwork) return { name: "wrong-network" };
  return { name: "ready" };
}

// "Browser wallet" is the stand-in name for a wallet that didn't say who it is; sentences read better without it.
const named = (info: WalletInfo | null | undefined) => (info && info.name !== "Browser wallet" ? info.name : null);

/**
 * The one place a visitor connects: pick a wallet, approve it, land on the GenLayer network,
 * and top up with test GEN, with a way forward from every failure.
 */
export function WalletModal() {
  const wallet = useWallet();
  const view = resolveView(wallet);

  return (
    <Dialog open={wallet.modal.open} onOpenChange={(open) => !open && wallet.closeModal()}>
      <DialogContent
        className={cn(
          "wallet-sheet max-h-[min(92dvh,46rem)] max-w-md overflow-y-auto p-0",
          // Phones get a bottom sheet in easy reach of the thumb.
          "max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:border-x-0 max-sm:border-b-0 max-sm:shadow-none",
        )}
      >
        <div key={view.name} className="wallet-view">
          {view.name === "account" && <AccountView wallet={wallet} />}
          {view.name === "picker" && <PickerView wallet={wallet} />}
          {view.name === "connecting" && <ConnectingView wallet={wallet} pending={view.wallet} />}
          {view.name === "connect-failed" && <ConnectFailedView wallet={wallet} pending={view.wallet} error={view.error} />}
          {view.name === "switching" && <SwitchingView wallet={wallet} />}
          {view.name === "switch-failed" && <SwitchFailedView wallet={wallet} error={view.error} />}
          {view.name === "wrong-network" && <WrongNetworkView wallet={wallet} />}
          {view.name === "ready" && <ReadyView wallet={wallet} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const STEPS = ["Wallet", "Network", "Ready"];

/** Where the visitor is in connect → network → ready; `current` past the last step means all done. */
function Stepper({ current, waiting = false }: { current: number; waiting?: boolean }) {
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Connection steps">
      {STEPS.map((label, index) => {
        const state = index < current ? "done" : index === current ? "active" : "todo";
        return (
          <li key={label} aria-current={state === "active" ? "step" : undefined} className="space-y-2">
            <span
              aria-hidden="true"
              className={cn(
                "block h-0.5",
                state === "done" && "bg-mint",
                state === "active" && "bg-signal",
                state === "todo" && "bg-[var(--line-strong)]",
                state === "active" && waiting && "wallet-pulse",
              )}
            />
            <span
              className={cn(
                "t-label flex items-center gap-1.5",
                state === "done" && "text-mint",
                state === "active" && "text-foreground",
              )}
            >
              {state === "done" ? <Check className="size-3" aria-hidden="true" /> : <span className="t-index">{index + 1}</span>}
              {label}
              {state === "done" && <span className="sr-only">(done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Frame({
  title,
  description,
  step,
  waiting,
  footer,
  children,
}: {
  title: string;
  description: ReactNode;
  step: number;
  waiting?: boolean;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="space-y-2 px-5 pb-4 pr-12 pt-5">
        <DialogTitle className="display-wide text-lg leading-tight tracking-[-0.01em] sm:text-xl">{title}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">{description}</DialogDescription>
      </header>
      <div className="border-y border-line px-5 py-3">
        <Stepper current={step} waiting={waiting} />
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
      {footer && <footer className="space-y-2 border-t border-line px-5 py-4 text-xs leading-relaxed text-muted-foreground">{footer}</footer>}
    </>
  );
}

function PickerView({ wallet }: { wallet: Wallet }) {
  const mobile = isMobileDevice();
  const installed = new Set(wallet.wallets.map((candidate) => candidate.info.rdns));
  const others = WALLET_GUIDES.filter((guide) => !installed.has(guide.rdns));

  return (
    <Frame
      title="Connect a wallet"
      description={`Pick the wallet you use. TraceMint adds the ${NETWORK} network to it for you.`}
      step={0}
      footer={
        <>
          <p className="flex gap-2">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-mint" aria-hidden="true" />
            Connecting shares only your public address. Nothing is signed until you approve it in your wallet.
          </p>
          <p>
            Browsing needs no wallet.{" "}
            <a href={WALLET_EXPLAINER_URL} target="_blank" rel="noreferrer" className="t-link">
              What is a wallet?
            </a>
          </p>
        </>
      }
    >
      {wallet.wallets.length > 0 ? (
        <>
          <section aria-labelledby="wallets-installed" className="space-y-2">
            <h3 id="wallets-installed" className="t-label">
              Installed in this browser
            </h3>
            <ul className="space-y-2">
              {wallet.wallets.map((candidate) => (
                <li key={candidate.info.rdns}>
                  <button
                    type="button"
                    onClick={() => void wallet.connect(candidate)}
                    className="group flex w-full items-center gap-3 border border-line bg-background/60 px-3 py-3 text-left transition-colors hover:border-signal focus-visible:border-signal"
                  >
                    <WalletIcon icon={candidate.info.icon} />
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{candidate.info.name}</span>
                    {wallet.wallets.length > 1 && candidate.info.rdns === RECOMMENDED_RDNS && (
                      <span className="chip chip-mint">Recommended</span>
                    )}
                    <ArrowRight
                      className="size-4 shrink-0 text-muted-foreground transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-signal"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>
          {!mobile && others.length > 0 && <MoreWallets guides={others} />}
        </>
      ) : mobile ? (
        <OpenInWalletApp />
      ) : (
        <NoWalletYet guides={others} />
      )}
      <DemoAccessPanel onStarted={wallet.closeModal} />
    </Frame>
  );
}

function InstallRow({ guide }: { guide: WalletGuide }) {
  return (
    <a
      href={guide.install}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:text-signal"
    >
      {guide.name}
      <span className="flex items-center gap-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
        Install
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}

function MoreWallets({ guides }: { guides: WalletGuide[] }) {
  return (
    <details className="group border border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
        Other wallets
        <ChevronDown className="size-4 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
      </summary>
      <ul className="divide-y divide-[var(--line)] border-t border-line">
        {guides.map((guide) => (
          <li key={guide.rdns}>
            <InstallRow guide={guide} />
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-3 py-2.5 text-xs text-muted-foreground">Reload this page after installing to connect it.</p>
    </details>
  );
}

function NoWalletYet({ guides }: { guides: WalletGuide[] }) {
  const [first, ...rest] = guides;
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3 className="text-base">No wallet in this browser yet</h3>
        <p className="text-sm text-muted-foreground">
          A wallet is a browser extension that holds your account and asks you before anything is signed.
        </p>
      </div>
      <Button asChild className="w-full">
        <a href={first.install} target="_blank" rel="noreferrer">
          Install {first.name}
          <ArrowUpRight aria-hidden="true" />
        </a>
      </Button>
      <ul className="divide-y divide-[var(--line)] border border-line">
        {rest.map((guide) => (
          <li key={guide.rdns}>
            <InstallRow guide={guide} />
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Installed one? Reload to connect it.</span>
        <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" />
          Reload
        </Button>
      </div>
    </div>
  );
}

function OpenInWalletApp() {
  const pageUrl = window.location.href;
  const apps = WALLET_GUIDES.flatMap((guide) => (guide.openInApp ? [{ guide, href: guide.openInApp(pageUrl) }] : []));
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h3 className="flex items-center gap-2 text-base">
          <Smartphone className="size-4 text-signal" aria-hidden="true" />
          Open TraceMint in your wallet app
        </h3>
        <p className="text-sm text-muted-foreground">
          Phone browsers can&apos;t reach wallet apps. Open this page in your wallet&apos;s own browser and connect there.
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2">
        {apps.map(({ guide, href }) => (
          <li key={guide.rdns}>
            <a
              href={href}
              className="flex h-full items-center justify-between gap-2 border border-line px-3 py-3 text-sm font-bold transition-colors hover:border-signal"
            >
              {guide.name}
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        No wallet app yet?{" "}
        <a href={WALLET_GUIDES[0].install} target="_blank" rel="noreferrer" className="t-link">
          Get {WALLET_GUIDES[0].name}
        </a>{" "}
        from your app store, then come back.
      </p>
    </div>
  );
}

/** The wallet's icon inside a turning ring: the site is waiting on the wallet. */
function AwaitingWallet({ icon }: { icon?: string }) {
  return (
    <span className="relative grid size-20 place-items-center">
      <svg className="absolute inset-0 size-full animate-spin [animation-duration:1.6s] motion-reduce:animate-none" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="38" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx="40" cy="40" r="38" fill="none" stroke="var(--signal)" strokeWidth="2" strokeDasharray="56 183" />
      </svg>
      <WalletIcon icon={icon} size="lg" />
    </span>
  );
}

function ConnectingView({ wallet, pending }: { wallet: Wallet; pending: DiscoveredWallet }) {
  const name = named(pending.info);
  return (
    <Frame
      title={name ? `Waiting for ${name}` : "Waiting for your wallet"}
      description={`Approve the connection request in ${name ?? "your wallet"}.`}
      step={0}
      waiting
    >
      <div className="flex flex-col items-center gap-4 py-1 text-center">
        <AwaitingWallet icon={pending.info.icon} />
        <p className="max-w-[34ch] text-sm text-muted-foreground" role="status">
          {isMobileDevice()
            ? `Look for ${name ?? "the wallet"}'s approval prompt on screen.`
            : `No request showing? Click ${name ? `the ${name}` : "your wallet's"} icon in the browser toolbar.`}
        </p>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={wallet.cancel}>
        <ArrowLeft aria-hidden="true" />
        Use another wallet
      </Button>
    </Frame>
  );
}

function connectFailureCopy(error: WalletError, name: string | null): [title: string, body: string] {
  switch (error.kind) {
    case "rejected":
      return ["Connection declined", `You declined the request in ${name ?? "your wallet"}, so nothing was shared.`];
    case "pending":
      return [
        `${name ?? "Your wallet"} has a request open`,
        `Open ${name ?? "your wallet"} from the browser toolbar and approve or dismiss the waiting request, then try again.`,
      ];
    case "no-accounts":
      return ["No account shared", `${name ?? "Your wallet"} didn't share an account. Unlock it or create an account in it, then try again.`];
    default:
      return ["Couldn't connect", error.message];
  }
}

function ConnectFailedView({ wallet, pending, error }: { wallet: Wallet; pending: DiscoveredWallet | null; error: WalletError }) {
  const [title, body] = connectFailureCopy(error, named(pending?.info));
  return (
    <Frame title={title} description={body} step={0}>
      <div className="grid gap-2 sm:grid-cols-2">
        {pending && (
          <Button type="button" onClick={() => void wallet.connect(pending)}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        )}
        <Button type="button" variant="outline" onClick={wallet.cancel} className={cn(!pending && "sm:col-span-2")}>
          <ArrowLeft aria-hidden="true" />
          Use another wallet
        </Button>
      </div>
    </Frame>
  );
}

function SwitchingView({ wallet }: { wallet: Wallet }) {
  const name = named(wallet.wallet);
  return (
    <Frame
      title="Switching to GenLayer"
      description={`The first time, ${name ?? "your wallet"} asks to add ${NETWORK}, then to switch to it. The request should match these details.`}
      step={1}
      waiting
    >
      <NetworkDetails />
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <LoaderCircle className="size-4 animate-spin text-signal motion-reduce:animate-none" aria-hidden="true" />
        Waiting for {name ?? "your wallet"}…
      </p>
    </Frame>
  );
}

function switchFailureCopy(error: WalletError, name: string | null, chain: string): [title: string, body: string] {
  switch (error.kind) {
    case "rejected":
      return [
        "Network not switched",
        `You're connected, but ${name ?? "your wallet"} is still on ${chain}. TraceMint needs ${NETWORK} to sign transactions.`,
      ];
    case "pending":
      return [
        `${name ?? "Your wallet"} has a request open`,
        `Open ${name ?? "your wallet"} and approve or dismiss the waiting request, then try again.`,
      ];
    case "unsupported":
      return [
        `${name ?? "Your wallet"} can't add GenLayer`,
        `Add the network by hand in ${name ?? "your wallet"}'s network settings with these details, or connect MetaMask, Rabby, or OKX Wallet instead.`,
      ];
    case "wrong-network":
      return [`Still on ${chain}`, `${name ?? "Your wallet"} didn't move to ${NETWORK}. Pick it in the wallet's network menu, or try again.`];
    default:
      return ["Couldn't switch networks", error.message];
  }
}

function SwitchFailedView({ wallet, error }: { wallet: Wallet; error: WalletError }) {
  const [title, body] = switchFailureCopy(error, named(wallet.wallet), describeChain(wallet.chainId));
  return (
    <Frame title={title} description={body} step={1}>
      {error.kind === "unsupported" && <NetworkDetails copyable />}
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" onClick={() => void wallet.switchNetwork()}>
          <RefreshCw aria-hidden="true" />
          Try again
        </Button>
        {error.kind === "unsupported" ? (
          <Button type="button" variant="outline" onClick={wallet.disconnect}>
            <ArrowLeft aria-hidden="true" />
            Use another wallet
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={wallet.closeModal}>
            Not now
          </Button>
        )}
      </div>
    </Frame>
  );
}

function WrongNetworkView({ wallet }: { wallet: Wallet }) {
  const name = named(wallet.wallet);
  const onTestnet = wallet.chainId === GENLAYER_TESTNET_CHAIN_ID;
  return (
    <Frame
      title="Switch to GenLayer"
      description={
        onTestnet
          ? `${name ?? "Your wallet"} is on the GenLayer Testnet. TraceMint runs on ${NETWORK}, a separate network with its own free GEN. Your testnet GEN stays where it is.`
          : `${name ?? "Your wallet"} is on ${describeChain(wallet.chainId)}. TraceMint runs on ${NETWORK}, so it signs there.`
      }
      step={1}
    >
      <Button type="button" className="w-full" onClick={() => void wallet.switchNetwork()}>
        Switch network
      </Button>
    </Frame>
  );
}

function BalanceRow({ balance }: { balance: ReturnType<typeof useGenBalance> }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="t-label">{NETWORK_SHORT_NAME} balance</span>
      <span className="font-mono text-sm tabular-nums">
        {balance.data !== undefined ? formatGen(balance.data, 2) : balance.isError ? "Unavailable" : "Checking…"}
      </span>
    </div>
  );
}

function ReadyView({ wallet }: { wallet: Wallet }) {
  const address = wallet.address as string;
  const balance = useGenBalance(address);
  const canFund = faucetAvailable(GENLAYER_CHAIN) && balance.data !== undefined && balance.data < FAUCET_CEILING_WEI;
  const empty = canFund && (balance.data as bigint) < GEN;

  return (
    <Frame title="You're connected" description={`${shortAddress(address)} on ${NETWORK}.`} step={STEPS.length}>
      <div className="border border-line px-3 py-3">
        <BalanceRow balance={balance} />
      </div>
      {canFund && (
        <p className="text-sm text-muted-foreground">
          Fees here are paid in {NETWORK_SHORT_NAME} GEN. It&apos;s separate from GEN on the GenLayer testnet, and free.
        </p>
      )}
      {empty ? (
        <div className="space-y-2">
          <TestGenButton address={address} size="default" className="w-full" />
          <Button type="button" variant="ghost" className="w-full" onClick={wallet.closeModal}>
            Skip for now
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button type="button" className="w-full" onClick={wallet.closeModal} autoFocus>
            Start using TraceMint
          </Button>
          {canFund && <TestGenButton address={address} variant="outline" size="default" className="w-full" />}
        </div>
      )}
    </Frame>
  );
}

function accountFailureCopy(error: WalletError, name: string | null): string {
  if (error.kind === "rejected") return "Account switch cancelled.";
  if (error.kind === "unsupported") {
    return `${name ?? "Your wallet"} picks accounts in its own window. Change the account there and TraceMint follows.`;
  }
  return error.message;
}

function AccountView({ wallet }: { wallet: Wallet }) {
  const address = wallet.address as string;
  const name = named(wallet.wallet);
  const balance = useGenBalance(address);
  const switching = wallet.activity === "switching";
  const failure = wallet.failure;
  const canFund = faucetAvailable(GENLAYER_CHAIN) && balance.data !== undefined && balance.data < FAUCET_CEILING_WEI;

  return (
    <>
      <header className="flex items-center gap-3 px-5 pb-4 pr-12 pt-5">
        <WalletIcon icon={wallet.wallet?.icon} size="lg" />
        <div className="min-w-0 space-y-0.5">
          <DialogTitle className="truncate text-base normal-case leading-snug tracking-normal">{name ?? "Your wallet"}</DialogTitle>
          <DialogDescription className="-ml-0.5 flex items-center text-xs">
            <span className="font-mono text-foreground" title={address}>
              {shortAddress(address, 6)}
            </span>
            <CopyButton value={address} label="Copy address" />
            <a
              href={addressLink(address)}
              target="_blank"
              rel="noreferrer"
              aria-label="View this address on the explorer"
              className="grid size-7 place-items-center text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </a>
          </DialogDescription>
        </div>
      </header>

      <div className="divide-y divide-[var(--line)] border-y border-line">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <span className="t-label">Network</span>
          <span className={cn("chip", wallet.isOnCorrectNetwork ? "chip-mint" : "chip-signal")}>
            {describeChain(wallet.chainId)}
          </span>
        </div>
        {!wallet.isOnCorrectNetwork && (
          <div className="space-y-3 px-5 py-3.5">
            <p className="text-sm">
              {wallet.chainId === GENLAYER_TESTNET_CHAIN_ID
                ? `TraceMint signs on ${NETWORK}, a separate network with its own free GEN. Your testnet GEN stays where it is.`
                : `TraceMint signs on ${NETWORK}. Switch networks to pay, register, or dispute.`}
            </p>
            {failure?.action === "switch" && (
              <p role="alert" className="text-xs text-destructive">
                {switchFailureCopy(failure.error, name, describeChain(wallet.chainId))[1]}
              </p>
            )}
            {failure?.action === "switch" && failure.error.kind === "unsupported" && <NetworkDetails copyable />}
            <Button type="button" className="w-full" onClick={() => void wallet.switchNetwork()} disabled={switching}>
              {switching && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
              {switching ? `Approve in ${name ?? "your wallet"}…` : "Switch network"}
            </Button>
          </div>
        )}
        <div className="space-y-3 px-5 py-3.5">
          <BalanceRow balance={balance} />
          {canFund && <TestGenButton address={address} variant={(balance.data as bigint) < GEN ? "default" : "outline"} className="w-full" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 py-4">
        <Button type="button" variant="outline" size="sm" onClick={() => void wallet.switchAccount()}>
          <UserRound aria-hidden="true" />
          Switch account
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            wallet.disconnect();
            wallet.openModal("connect");
          }}
        >
          <Repeat aria-hidden="true" />
          Change wallet
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="col-span-2 hover:border-destructive hover:text-destructive"
          onClick={() => {
            wallet.disconnect();
            wallet.closeModal();
          }}
        >
          <LogOut aria-hidden="true" />
          Disconnect
        </Button>
        {failure?.action === "account" && (
          <p role="status" className="col-span-2 text-xs text-muted-foreground">
            {accountFailureCopy(failure.error, name)}
          </p>
        )}
      </div>
    </>
  );
}
