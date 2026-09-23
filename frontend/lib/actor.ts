"use client";

import { demoAddress, type DemoRole } from "./demo/roles";
import { shortAddress } from "./format";

/** The wallet a write will be signed with: the demo role's wallet in demo mode, otherwise the connected one. */
export function actingAddress(role: DemoRole | null, address: string | null): string | null {
  const acting = role ? demoAddress(role) : address;
  return acting && acting.startsWith("0x") ? acting : null;
}

const sameWallet = (one: string, other: string) => one.toLowerCase() === other.toLowerCase();

/**
 * Why this actor cannot run an action the contract reserves for one wallet, or null when they can.
 * The contract checks this as well, but a transaction it can only reject costs a fee and two minutes of
 * consensus before saying so, and "the transaction did not succeed" tells nobody what went wrong.
 * An unknown acting wallet is not treated as a mismatch: the contract stays the authority.
 */
export function walletOnlyReason(options: {
  /** The wallet the contract will accept. */
  expected: string;
  /** The wallet this page would sign with, if it knows it. */
  actor: string | null;
  /** The action, phrased to follow "can": "change this watchlist". */
  action: string;
  inDemoMode: boolean;
}): string | null {
  const { expected, actor, action, inDemoMode } = options;
  if (!expected.startsWith("0x")) return null;
  if (actor === null) return inDemoMode ? null : `Connect ${shortAddress(expected)} to ${action}.`;
  if (sameWallet(actor, expected)) return null;
  return inDemoMode
    ? `Only ${shortAddress(expected)} can ${action}. Exit demo mode and connect that wallet to continue.`
    : `Only ${shortAddress(expected)} can ${action}. Switch to that wallet and try again.`;
}
