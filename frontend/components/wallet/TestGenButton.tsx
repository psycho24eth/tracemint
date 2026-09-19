"use client";

import { Droplets, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FAUCET_AMOUNT_GEN, faucetAvailable } from "@/lib/faucet";
import { GENLAYER_CHAIN } from "@/lib/genlayer/network";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";

type Request = { name: "idle" } | { name: "sending" } | { name: "sent" } | { name: "failed"; message: string };

/** Asks the Studio network's faucet for test GEN, so a new wallet can pay transaction fees. */
export function TestGenButton({
  address,
  variant = "default",
  size = "sm",
  className,
}: {
  address: string;
  variant?: "default" | "outline";
  size?: "sm" | "default";
  className?: string;
}) {
  const refresh = useRefreshLicenseHunter();
  const [request, setRequest] = useState<Request>({ name: "idle" });
  if (!faucetAvailable(GENLAYER_CHAIN)) return null;

  async function send() {
    setRequest({ name: "sending" });
    try {
      const response = await fetch("/api/faucet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The faucet didn't answer. Try again in a minute.");
      setRequest({ name: "sent" });
      void refresh();
    } catch (error) {
      setRequest({ name: "failed", message: (error as Error).message });
    }
  }

  const amount = `${FAUCET_AMOUNT_GEN} test GEN`;
  return (
    <div className="space-y-1.5">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={send}
        disabled={request.name === "sending" || request.name === "sent"}
      >
        {request.name === "sending" ? (
          <LoaderCircle className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Droplets aria-hidden="true" />
        )}
        {request.name === "sending" ? "Sending…" : request.name === "sent" ? `${amount} sent` : `Get ${amount}`}
      </Button>
      {request.name === "failed" && (
        <p role="alert" className="text-xs text-destructive">
          {request.message}
        </p>
      )}
      {request.name === "sent" && (
        <p role="status" className="text-xs text-mint">
          Added to your wallet. The balance updates in a few seconds.
        </p>
      )}
    </div>
  );
}
