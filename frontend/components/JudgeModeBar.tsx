"use client";

import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, type DemoRole } from "@/lib/demo/roles";

const ROLES: DemoRole[] = ["creator", "site-owner"];

export function JudgeModeBar() {
  const { role, setRole, accessCode, exit } = useDemoMode();
  if (!accessCode) return null;

  return (
    <div className="border-t border-white/10 bg-cyan-400/5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-xs">
        <span className="font-semibold uppercase tracking-[0.15em] text-accent">Judge mode</span>
        <span className="text-muted-foreground">Acting as</span>
        <div role="radiogroup" aria-label="Act as" className="flex rounded-md border border-border p-0.5">
          {ROLES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={role === option}
              onClick={() => setRole(option)}
              className={`whitespace-nowrap rounded px-2 py-1 transition-colors ${
                role === option ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {DEMO_ROLE_LABELS[option]}
            </button>
          ))}
        </div>
        <button type="button" onClick={exit} className="ml-auto text-muted-foreground hover:text-foreground">
          Exit judge mode
        </button>
      </div>
    </div>
  );
}
