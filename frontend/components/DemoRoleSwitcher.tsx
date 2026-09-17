"use client";

import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, demoAddress, type DemoRole } from "@/lib/demo/roles";

const OPTIONS: Array<{ role: DemoRole | null; label: string; title: string }> = [
  { role: null, label: "Wallet", title: "Use your own MetaMask wallet" },
  { role: "creator", label: "Creator", title: DEMO_ROLE_LABELS.creator },
  { role: "site-owner", label: "Site owner", title: DEMO_ROLE_LABELS["site-owner"] },
];

export function DemoRoleSwitcher() {
  const { role, setRole } = useDemoMode();

  return (
    <div role="radiogroup" aria-label="Act as" className="flex rounded-md border border-border p-0.5 text-xs">
      {OPTIONS.map((option) => {
        const active = option.role === role;
        return (
          <button
            key={option.label}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            disabled={option.role !== null && !demoAddress(option.role)}
            onClick={() => setRole(option.role)}
            className={`whitespace-nowrap rounded px-2 py-1 transition-colors disabled:opacity-40 ${
              active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
