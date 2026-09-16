"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import LicenseHunter from "../contracts/LicenseHunter";
import { getContractAddress } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";

const QUERY_PREFIX = "license-hunter";

export function useLicenseHunter(): LicenseHunter | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  return useMemo(
    () => (contractAddress ? new LicenseHunter(contractAddress, address) : null),
    [contractAddress, address],
  );
}

function useContractQuery<T>(name: string, params: unknown[], read: (contract: LicenseHunter) => Promise<T>, enabled = true) {
  const contract = useLicenseHunter();
  return useQuery<T, Error>({
    queryKey: [QUERY_PREFIX, name, ...params],
    queryFn: () => read(contract as LicenseHunter),
    enabled: contract !== null && enabled,
    staleTime: 3_000,
    refetchInterval: 15_000,
  });
}

export const useWorks = () => useContractQuery("works", [], (contract) => contract.listWorks());
export const useWork = (id: number) => useContractQuery("work", [id], (contract) => contract.getWork(id), id > 0);
export const useClaims = (workId: number) =>
  useContractQuery("claims", [workId], (contract) => contract.listClaims(workId), workId > 0);
export const useClaim = (id: number) => useContractQuery("claim", [id], (contract) => contract.getClaim(id), id > 0);
export const useNotices = () => useContractQuery("notices", [], (contract) => contract.listNotices());
export const useLicense = (id: number) => useContractQuery("license", [id], (contract) => contract.getLicense(id), id > 0);
export const useLicenseForClaim = (claimId: number, enabled: boolean) =>
  useContractQuery("license-for-claim", [claimId], (contract) => contract.findLicenseForClaim(claimId), claimId > 0 && enabled);
export const useEarnings = (creator: string | null) =>
  useContractQuery("earnings", [creator], (contract) => contract.getEarnings(creator as string), Boolean(creator));
export const useStats = () => useContractQuery("stats", [], (contract) => contract.getStats());

export function useRefreshLicenseHunter() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: [QUERY_PREFIX] }), [queryClient]);
}
