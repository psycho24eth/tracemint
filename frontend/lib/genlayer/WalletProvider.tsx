"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  ensureGenLayerChain,
  parseChainId,
  readChainId,
  toWalletError,
  WalletError,
  withChainGuard,
  type Eip1193Provider,
} from "./connection";
import { waitForWallet, watchWallets, type DiscoveredWallet, type WalletInfo } from "./eip6963";
import { GENLAYER_CHAIN_ID } from "./network";

// The rdns of the wallet to reconnect, silently, on the visitor's next page load.
const WALLET_KEY = "tracemint.wallet";
const RESTORE_TIMEOUT_MS = 600;

export type WalletActivity = "idle" | "connecting" | "switching";
export type WalletModalView = "connect" | "account";
export type WalletFailure = { action: "connect" | "switch" | "account"; error: WalletError };

type Session = { wallet: DiscoveredWallet; address: string; chainId: number | null };

export interface WalletState {
  /** Wallets installed in this browser. */
  wallets: DiscoveredWallet[];
  /** The connected wallet. */
  wallet: WalletInfo | null;
  /** The wallet of the connection in progress, or of the last one that failed. */
  pendingWallet: DiscoveredWallet | null;
  address: string | null;
  chainId: number | null;
  activity: WalletActivity;
  failure: WalletFailure | null;
  isConnected: boolean;
  isOnCorrectNetwork: boolean;
  /** True while a returning visitor's wallet is reconnected on page load. */
  isRestoring: boolean;
  /** The connected wallet, wrapped so it switches to GenLayer before it signs anything. */
  provider: Eip1193Provider | null;
  modal: { open: boolean; view: WalletModalView };
}

interface WalletContextValue extends WalletState {
  connect: (wallet: DiscoveredWallet) => Promise<void>;
  /** Stops waiting for the wallet's answer; a late answer is ignored. */
  cancel: () => void;
  switchNetwork: () => Promise<boolean>;
  switchAccount: () => Promise<void>;
  disconnect: () => void;
  openModal: (view?: WalletModalView) => void;
  closeModal: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private windows); the wallet then reconnects by hand next visit.
  }
}

async function accountsFrom(provider: Eip1193Provider, method: "eth_accounts" | "eth_requestAccounts"): Promise<string[]> {
  const result = await provider.request({ method });
  return Array.isArray(result) ? result.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Owns the wallet connection for the whole app: which wallets are installed, which one is connected,
 * and keeping it on the GenLayer network.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [pendingWallet, setPendingWallet] = useState<DiscoveredWallet | null>(null);
  const [activity, setActivity] = useState<WalletActivity>("idle");
  const [failure, setFailure] = useState<WalletFailure | null>(null);
  const [isRestoring, setRestoring] = useState(true);
  const [modal, setModal] = useState<WalletState["modal"]>({ open: false, view: "connect" });
  // Each connection attempt is numbered so a late answer from an abandoned one is ignored.
  const attempt = useRef(0);
  const switching = useRef<Promise<boolean> | null>(null);

  useEffect(() => watchWallets(setWallets), []);

  // eth_accounts answers without a prompt, and only while the site is still authorized.
  useEffect(() => {
    let cancelled = false;
    const remembered = readStored(WALLET_KEY);
    if (!remembered) {
      setRestoring(false);
      return;
    }
    const startedAt = attempt.current;
    void (async () => {
      const wallet = await waitForWallet(remembered, RESTORE_TIMEOUT_MS);
      const accounts = wallet ? await accountsFrom(wallet.provider, "eth_accounts").catch(() => []) : [];
      const chainId = wallet && accounts.length > 0 ? await readChainId(wallet.provider) : null;
      // A connection the visitor started meanwhile wins over the restored one.
      if (cancelled || attempt.current !== startedAt) return;
      if (wallet && accounts.length > 0) setSession({ wallet, address: accounts[0], chainId });
      else if (wallet) store(WALLET_KEY, null);
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connectedProvider = session?.wallet.provider;
  useEffect(() => {
    if (!connectedProvider?.on) return;
    const onAccounts = (accounts: unknown) => {
      const [next] = Array.isArray(accounts) ? accounts : [];
      if (typeof next === "string") {
        setSession((current) => (current ? { ...current, address: next } : current));
        return;
      }
      // The visitor disconnected the site from inside the wallet.
      store(WALLET_KEY, null);
      setSession(null);
    };
    const onChain = (chainId: unknown) =>
      setSession((current) => (current ? { ...current, chainId: parseChainId(chainId) } : current));
    connectedProvider.on("accountsChanged", onAccounts);
    connectedProvider.on("chainChanged", onChain);
    return () => {
      connectedProvider.removeListener?.("accountsChanged", onAccounts);
      connectedProvider.removeListener?.("chainChanged", onChain);
    };
  }, [connectedProvider]);

  const connect = useCallback(async (wallet: DiscoveredWallet) => {
    const current = ++attempt.current;
    const isCurrent = () => attempt.current === current;
    setFailure(null);
    setPendingWallet(wallet);
    setActivity("connecting");

    let address: string | undefined;
    try {
      [address] = await accountsFrom(wallet.provider, "eth_requestAccounts");
      if (!address) throw new WalletError("no-accounts", "The wallet did not share an account.");
    } catch (error) {
      if (isCurrent()) {
        setActivity("idle");
        setFailure({ action: "connect", error: toWalletError(error, "Could not connect") });
      }
      return;
    }
    if (!isCurrent()) return;

    store(WALLET_KEY, wallet.info.rdns);
    const chainId = await readChainId(wallet.provider);
    if (!isCurrent()) return;
    setSession({ wallet, address, chainId });
    setPendingWallet(null);
    if (chainId === GENLAYER_CHAIN_ID) {
      setActivity("idle");
      return;
    }

    // Straight on to the network: the visitor just clicked, so the wallet's prompt is expected.
    setActivity("switching");
    try {
      await ensureGenLayerChain(wallet.provider);
      if (isCurrent()) setSession((live) => live && { ...live, chainId: GENLAYER_CHAIN_ID });
    } catch (error) {
      if (isCurrent()) setFailure({ action: "switch", error: toWalletError(error, "Could not switch networks") });
    } finally {
      if (isCurrent()) setActivity("idle");
    }
  }, []);

  const cancel = useCallback(() => {
    attempt.current += 1;
    setPendingWallet(null);
    setActivity("idle");
    setFailure(null);
  }, []);

  const switchNetwork = useCallback(() => {
    if (!session) return Promise.resolve(false);
    // A second click while the wallet is still asking reuses the open request instead of stacking another.
    switching.current ??= (async () => {
      setFailure(null);
      setActivity("switching");
      try {
        await ensureGenLayerChain(session.wallet.provider);
        setSession((live) => live && { ...live, chainId: GENLAYER_CHAIN_ID });
        return true;
      } catch (error) {
        setFailure({ action: "switch", error: toWalletError(error, "Could not switch networks") });
        return false;
      } finally {
        setActivity("idle");
        switching.current = null;
      }
    })();
    return switching.current;
  }, [session]);

  const switchAccount = useCallback(async () => {
    if (!session) return;
    setFailure(null);
    try {
      await session.wallet.provider.request({ method: "wallet_requestPermissions", params: [{ eth_accounts: {} }] });
      const [next] = await accountsFrom(session.wallet.provider, "eth_accounts");
      if (next) setSession((live) => live && { ...live, address: next });
    } catch (error) {
      setFailure({ action: "account", error: toWalletError(error, "Could not switch accounts") });
    }
  }, [session]);

  const disconnect = useCallback(() => {
    attempt.current += 1;
    // Also revoke the site's access where the wallet supports it, so the next visit asks again.
    session?.wallet.provider.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
    store(WALLET_KEY, null);
    setSession(null);
    setPendingWallet(null);
    setActivity("idle");
    setFailure(null);
  }, [session]);

  const openModal = useCallback((view: WalletModalView = "connect") => setModal({ open: true, view }), []);
  const closeModal = useCallback(() => {
    setModal((current) => ({ ...current, open: false }));
    setFailure(null);
  }, []);

  const provider = useMemo(() => (connectedProvider ? withChainGuard(connectedProvider) : null), [connectedProvider]);

  const value = useMemo<WalletContextValue>(
    () => ({
      wallets,
      wallet: session?.wallet.info ?? null,
      pendingWallet,
      address: session?.address ?? null,
      chainId: session?.chainId ?? null,
      activity,
      failure,
      isConnected: session !== null,
      isOnCorrectNetwork: session?.chainId === GENLAYER_CHAIN_ID,
      isRestoring,
      provider,
      modal,
      connect,
      cancel,
      switchNetwork,
      switchAccount,
      disconnect,
      openModal,
      closeModal,
    }),
    [wallets, session, pendingWallet, activity, failure, isRestoring, provider, modal, connect, cancel, switchNetwork, switchAccount, disconnect, openModal, closeModal],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
