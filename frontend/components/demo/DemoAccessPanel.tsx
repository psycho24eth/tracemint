"use client";

import { ArrowRight, FlaskConical, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/wallet/CopyButton";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { cn } from "@/lib/utils";

type Issued = { code: string; expiresAt: number };
type Step =
  | { name: "idle" }
  | { name: "issuing" }
  | { name: "issued"; issued: Issued }
  | { name: "starting"; issued: Issued }
  | { name: "failed"; message: string; issued?: Issued };

function hoursLeft(expiresAt: number): number {
  return Math.max(1, Math.round((expiresAt - Date.now()) / 3_600_000));
}

/**
 * Demo only: issues the visitor a new, unique access code. With it, TraceMint's own funded test wallets
 * sign for them, so every flow works without a wallet of their own.
 */
export function DemoAccessPanel({ onStarted, className }: { onStarted?: () => void; className?: string }) {
  const { accessCode, unlock } = useDemoMode();
  const [step, setStep] = useState<Step>({ name: "idle" });

  if (accessCode) return null;

  async function issue() {
    setStep({ name: "issuing" });
    try {
      const response = await fetch("/api/demo/code", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as Partial<Issued> & { error?: string };
      if (!response.ok || typeof body.code !== "string" || typeof body.expiresAt !== "number") {
        throw new Error(body.error ?? "Couldn't create a demo code. Try again.");
      }
      setStep({ name: "issued", issued: { code: body.code, expiresAt: body.expiresAt } });
    } catch (error) {
      setStep({ name: "failed", message: (error as Error).message });
    }
  }

  async function start(issued: Issued) {
    setStep({ name: "starting", issued });
    try {
      await unlock(issued.code);
      onStarted?.();
    } catch (error) {
      setStep({ name: "failed", message: (error as Error).message, issued });
    }
  }

  const issued = "issued" in step ? step.issued : undefined;

  return (
    <section aria-labelledby="demo-access-title" className={cn("space-y-3 border border-dashed border-signal/45 p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <h3 id="demo-access-title" className="flex items-center gap-2 text-base">
          <FlaskConical className="size-4 text-signal" aria-hidden="true" />
          Try it without a wallet
        </h3>
        <span className="chip chip-signal">Demo only</span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Get an access code and TraceMint&apos;s own test wallets sign for you, as a demo creator or site owner. Test
        network only: no real money moves.
      </p>

      {issued ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 border border-line bg-background/70 py-1 pl-3 pr-1">
            <code className="truncate font-mono text-sm tracking-[0.08em] text-foreground">{issued.code}</code>
            <CopyButton value={issued.code} label="Copy demo code" />
          </div>
          <p className="text-xs text-muted-foreground">Unique to you. Works for {hoursLeft(issued.expiresAt)} hours.</p>
          <Button type="button" className="w-full" onClick={() => void start(issued)} disabled={step.name === "starting"}>
            {step.name === "starting" && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {step.name === "starting" ? "Starting demo…" : "Start demo mode"}
            {step.name !== "starting" && <ArrowRight aria-hidden="true" />}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-full" onClick={() => void issue()} disabled={step.name === "issuing"}>
          {step.name === "issuing" && <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {step.name === "issuing" ? "Creating your code…" : "Get a demo access code"}
        </Button>
      )}

      {step.name === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {step.message}
        </p>
      )}
    </section>
  );
}
