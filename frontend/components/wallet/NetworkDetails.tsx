import { GENLAYER_CHAIN_ID, GENLAYER_NETWORK } from "@/lib/genlayer/network";

import { CopyButton } from "./CopyButton";

// In the order wallets ask for them when a network is added by hand.
const ROWS: [label: string, value: string][] = [
  ["Network name", GENLAYER_NETWORK.chainName],
  ["RPC URL", GENLAYER_NETWORK.rpcUrls[0]],
  ["Chain ID", String(GENLAYER_CHAIN_ID)],
  ["Currency symbol", GENLAYER_NETWORK.nativeCurrency.symbol],
  ["Block explorer", GENLAYER_NETWORK.blockExplorerUrls[0]],
];

/** The GenLayer network's settings, so visitors can check a wallet prompt or add the network by hand. */
export function NetworkDetails({ copyable = false }: { copyable?: boolean }) {
  return (
    <dl className="divide-y divide-[var(--line)] border border-line text-xs">
      {ROWS.map(([label, value]) => (
        <div key={label} className={`flex items-center justify-between gap-4 px-3 ${copyable ? "py-1" : "py-2"}`}>
          <dt className="t-label shrink-0">{label}</dt>
          <dd className="flex min-w-0 items-center gap-1">
            <span className="truncate text-right" title={value}>
              {value}
            </span>
            {copyable && <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}
