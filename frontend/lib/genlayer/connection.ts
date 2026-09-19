import { GENLAYER_CHAIN_ID, GENLAYER_CHAIN_ID_HEX, GENLAYER_NETWORK } from "./network";

/** The part of EIP-1193 TraceMint uses, so any injected wallet works, not only MetaMask. */
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, listener: (...args: any[]) => void): unknown;
  removeListener?(event: string, listener: (...args: any[]) => void): unknown;
}

export type WalletErrorKind = "rejected" | "pending" | "unsupported" | "no-accounts" | "wrong-network" | "failed";

/** A wallet failure sorted into the cases the interface explains differently. */
export class WalletError extends Error {
  constructor(
    readonly kind: WalletErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "WalletError";
  }
}

type ProviderFailure = { code?: number; message?: string };

function asFailure(error: unknown): ProviderFailure {
  return typeof error === "object" && error !== null ? (error as ProviderFailure) : { message: String(error) };
}

export function toWalletError(error: unknown, fallback: string): WalletError {
  if (error instanceof WalletError) return error;
  const { code, message = "" } = asFailure(error);
  if (code === 4001 || /user (rejected|denied|cancell?ed)|request rejected/i.test(message)) {
    return new WalletError("rejected", "The request was declined in the wallet.");
  }
  if (code === -32002 || /already pending|already processing/i.test(message)) {
    return new WalletError("pending", "The wallet already has a request open.");
  }
  if (code === 4200 || code === -32601 || /not supported|unsupported|method not found|does not exist/i.test(message)) {
    return new WalletError("unsupported", "The wallet does not support this request.");
  }
  return new WalletError("failed", message ? `${fallback}: ${message}` : fallback);
}

/** Reads a chain id reported as hex ("0xf22d"), decimal ("61997"), or a number. */
export function parseChainId(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const id = value.startsWith("0x") ? Number.parseInt(value, 16) : Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

export async function readChainId(provider: Eip1193Provider): Promise<number | null> {
  try {
    return parseChainId(await provider.request({ method: "eth_chainId" }));
  } catch {
    return null;
  }
}

const KNOWN_CHAINS: Record<number, string> = {
  1: "Ethereum",
  10: "OP Mainnet",
  56: "BNB Chain",
  137: "Polygon",
  324: "zkSync Era",
  4221: "GenLayer Testnet",
  8453: "Base",
  17000: "Holesky",
  42161: "Arbitrum One",
  43114: "Avalanche",
  59144: "Linea",
  61127: "GenLayer Localnet",
  61999: "GenLayer Studio",
  84532: "Base Sepolia",
  11155111: "Sepolia",
};

/** A readable name for the network a wallet is on. */
export function describeChain(chainId: number | null): string {
  if (chainId === null) return "an unknown network";
  if (chainId === GENLAYER_CHAIN_ID) return GENLAYER_NETWORK.chainName;
  return KNOWN_CHAINS[chainId] ?? `chain ${chainId}`;
}

const requestSwitch = (provider: Eip1193Provider) =>
  provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: GENLAYER_CHAIN_ID_HEX }] });

// Some wallets resolve the switch a moment before they report the new chain.
async function settlesOnGenLayer(provider: Eip1193Provider): Promise<boolean> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if ((await readChainId(provider)) === GENLAYER_CHAIN_ID) return true;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return false;
}

/**
 * Puts the wallet on the GenLayer network, adding the network first if the wallet has never seen it.
 * Resolves once the wallet reports the GenLayer chain; throws a WalletError otherwise.
 */
export async function ensureGenLayerChain(provider: Eip1193Provider): Promise<void> {
  if ((await readChainId(provider)) === GENLAYER_CHAIN_ID) return;

  try {
    await requestSwitch(provider);
  } catch (switchError) {
    const failure = toWalletError(switchError, "Could not switch networks");
    if (failure.kind === "rejected" || failure.kind === "pending") throw failure;
    // Wallets report a chain they have never seen in different ways (4902, a wrapped -32603, plain text),
    // so any failure other than a refusal is answered by adding the network.
    try {
      await provider.request({ method: "wallet_addEthereumChain", params: [GENLAYER_NETWORK] });
    } catch (addError) {
      const addFailure = toWalletError(addError, "Could not add the GenLayer network");
      if (addFailure.kind === "rejected" || addFailure.kind === "pending") throw addFailure;
      throw new WalletError("unsupported", "The wallet could not add the GenLayer network.");
    }
    // MetaMask switches while adding a network; other wallets need the switch requested again.
    if ((await readChainId(provider)) !== GENLAYER_CHAIN_ID) {
      try {
        await requestSwitch(provider);
      } catch (retryError) {
        throw toWalletError(retryError, "Could not switch networks");
      }
    }
  }

  if (!(await settlesOnGenLayer(provider))) {
    throw new WalletError("wrong-network", "The wallet is still on another network.");
  }
}

const SIGNING_METHODS = new Set(["eth_sendTransaction", "eth_signTransaction"]);

/**
 * Wraps a wallet so it never signs a transaction on another chain. GenLayer's SDK skips its own chain
 * check on Studio networks, so without this a wallet left on Ethereum would sign there.
 */
export function withChainGuard(provider: Eip1193Provider): Eip1193Provider {
  return {
    async request(args) {
      if (SIGNING_METHODS.has(args.method)) await ensureGenLayerChain(provider);
      return provider.request(args);
    },
  };
}
