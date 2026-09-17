"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { demoAddress, type DemoRole } from "@/lib/demo/roles";
import { useWallet } from "@/lib/genlayer/wallet";

const STORAGE_KEY = "licensehunter.demoRole";

type DemoMode = { role: DemoRole | null; setRole: (role: DemoRole | null) => void };

const DemoModeContext = createContext<DemoMode>({ role: null, setRole: () => {} });

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "creator" || saved === "site-owner") setRoleState(saved);
    } catch {
      // Storage can be unavailable (private windows); start in wallet mode.
    }
  }, []);

  const setRole = useCallback((next: DemoRole | null) => {
    setRoleState(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, next);
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // The role still applies for this visit.
    }
  }, []);

  const value = useMemo(() => ({ role, setRole }), [role, setRole]);
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): DemoMode {
  return useContext(DemoModeContext);
}

/** The address the app acts as: the active demo role's wallet, or else the connected wallet. */
export function useActingAddress(): string | null {
  const { role } = useDemoMode();
  const { address } = useWallet();
  return role ? demoAddress(role) || null : address;
}
