"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { demoAddress, type DemoRole } from "@/lib/demo/roles";
import { useWallet } from "@/lib/genlayer/wallet";

const ROLE_KEY = "licensehunter.demoRole";
const ACCESS_KEY = "tracemint.judgeAccess";

type DemoMode = {
  role: DemoRole | null;
  setRole: (role: DemoRole | null) => void;
  accessCode: string | null;
  unlock: (code: string) => Promise<void>;
  exit: () => void;
};

const DemoModeContext = createContext<DemoMode>({
  role: null,
  setRole: () => {},
  accessCode: null,
  unlock: async () => {},
  exit: () => {},
});

function store(key: string, value: string | null) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Storage can be unavailable (private windows); the state still applies for this visit.
  }
}

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      const code = window.localStorage.getItem(ACCESS_KEY);
      if (!code) return;
      setAccessCode(code);
      const saved = window.localStorage.getItem(ROLE_KEY);
      if (saved === "creator" || saved === "site-owner") setRoleState(saved);
    } catch {
      // Without storage, judge mode starts locked.
    }
  }, []);

  const setRole = useCallback((next: DemoRole | null) => {
    setRoleState(next);
    store(ROLE_KEY, next);
  }, []);

  const unlock = useCallback(
    async (code: string) => {
      const response = await fetch("/api/demo/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "That access code is not valid.");
      }
      setAccessCode(code);
      store(ACCESS_KEY, code);
      setRole("creator");
    },
    [setRole],
  );

  const exit = useCallback(() => {
    setAccessCode(null);
    store(ACCESS_KEY, null);
    setRole(null);
  }, [setRole]);

  const value = useMemo(() => ({ role, setRole, accessCode, unlock, exit }), [role, setRole, accessCode, unlock, exit]);
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
