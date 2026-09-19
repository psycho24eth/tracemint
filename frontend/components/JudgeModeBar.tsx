"use client";

import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, type DemoRole } from "@/lib/demo/roles";

const ROLES: DemoRole[] = ["creator", "site-owner"];

export function JudgeModeBar() {
  const { role, setRole, accessCode, exit } = useDemoMode();
  if (!accessCode) return null;

  return (
    <div className="border-t border-signal/40 bg-signal/[0.07]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-xs md:px-6">
        <span className="flex items-center gap-2 font-bold uppercase tracking-[0.16em] text-signal">
          <span className="live-dot" aria-hidden="true" />
          Demo mode
        </span>
        <span className="t-label">Acting as</span>
        <div role="radiogroup" aria-label="Act as" className="flex border border-line">
          {ROLES.map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={role === option}
              onClick={() => setRole(option)}
              className={`whitespace-nowrap px-3 py-1 uppercase tracking-[0.1em] transition-colors ${
                role === option ? "bg-signal text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {DEMO_ROLE_LABELS[option]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={exit}
          className="ml-auto uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
        >
          Exit demo mode
        </button>
      </div>
    </div>
  );
}
