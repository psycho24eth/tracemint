import { GENLAYER_CHAIN } from "./network";

export {
  GENLAYER_CHAIN,
  GENLAYER_CHAIN_ID,
  GENLAYER_CHAIN_ID_HEX,
  GENLAYER_NETWORK,
} from "./network";

/**
 * Get the GenLayer RPC URL from environment variables
 */
export function getStudioUrl(): string {
  return GENLAYER_CHAIN.rpcUrls.default.http[0];
}

/**
 * Get the contract address from environment variables
 */
export function getContractAddress(): string {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) {
    // Return empty string during build, error will be shown in UI during runtime
    return "";
  }
  return address;
}
