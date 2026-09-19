import type { Eip1193Provider } from "./connection";

/** What a wallet says about itself when it announces (EIP-6963). */
export interface WalletInfo {
  uuid: string;
  name: string;
  /** A data: URI image; empty for wallets found only through window.ethereum. */
  icon: string;
  /** Reverse-DNS id such as "io.metamask". Stable across page loads, unlike uuid. */
  rdns: string;
}

export interface DiscoveredWallet {
  info: WalletInfo;
  provider: Eip1193Provider;
}

/** The id given to a wallet that injects window.ethereum without announcing itself. */
export const INJECTED_RDNS = "injected";

// Many wallets also set isMetaMask for compatibility, so MetaMask is checked last.
const INJECTED_NAMES: [flag: string, name: string][] = [
  ["isRabby", "Rabby Wallet"],
  ["isOkxWallet", "OKX Wallet"],
  ["isOKExWallet", "OKX Wallet"],
  ["isCoinbaseWallet", "Coinbase Wallet"],
  ["isTrust", "Trust Wallet"],
  ["isTrustWallet", "Trust Wallet"],
  ["isBraveWallet", "Brave Wallet"],
  ["isZerion", "Zerion"],
  ["isRainbow", "Rainbow"],
  ["isFrame", "Frame"],
  ["isPhantom", "Phantom"],
  ["isMetaMask", "MetaMask"],
];

/** The wallet behind window.ethereum, for older extensions and in-app browsers that don't announce. */
export function injectedWallet(): DiscoveredWallet | null {
  if (typeof window === "undefined") return null;
  const ethereum = (window as unknown as { ethereum?: Eip1193Provider & Record<string, unknown> }).ethereum;
  if (!ethereum || typeof ethereum.request !== "function") return null;
  const name = INJECTED_NAMES.find(([flag]) => ethereum[flag] === true)?.[1] ?? "Browser wallet";
  return { info: { uuid: INJECTED_RDNS, name, icon: "", rdns: INJECTED_RDNS }, provider: ethereum };
}

type Announcement = CustomEvent<{ info?: Partial<WalletInfo>; provider?: Eip1193Provider }>;

/**
 * Lists the wallets installed in this browser and reports each change, starting immediately.
 * Wallets announce themselves (EIP-6963); window.ethereum is used only when none do.
 */
export function watchWallets(onChange: (wallets: DiscoveredWallet[]) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const announced = new Map<string, DiscoveredWallet>();

  const publish = () => {
    const wallets = [...announced.values()];
    const injected = wallets.length === 0 ? injectedWallet() : null;
    onChange(injected ? [injected] : wallets);
  };

  const onAnnounce = (event: Event) => {
    const { info, provider } = (event as Announcement).detail ?? {};
    if (!info?.rdns || !info.name || typeof provider?.request !== "function") return;
    announced.set(info.rdns, {
      info: { uuid: info.uuid ?? info.rdns, name: info.name, icon: info.icon ?? "", rdns: info.rdns },
      provider,
    });
    publish();
  };

  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  publish();
  return () => window.removeEventListener("eip6963:announceProvider", onAnnounce);
}

/** Resolves with the wallet once it has announced itself, or null if it hasn't within the timeout. */
export function waitForWallet(rdns: string, timeoutMs: number): Promise<DiscoveredWallet | null> {
  return new Promise((resolve) => {
    let settled = false;
    let stop: (() => void) | undefined;
    const finish = (wallet: DiscoveredWallet | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stop?.();
      resolve(wallet);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    stop = watchWallets((wallets) => {
      const match = wallets.find((wallet) => wallet.info.rdns === rdns);
      if (match) finish(match);
    });
    // The wallet may have answered while watchWallets was still starting, before stop existed.
    if (settled) stop();
  });
}
