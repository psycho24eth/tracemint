"use client";

import { useCallback, useState } from "react";

import { txLink } from "@/lib/format";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import { Button } from "./ui/button";

type ScanState = "idle" | "loading" | "success" | "error";

type FiledClaim = {
  hash: string;
  pageUrl: string;
  imageUrl: string;
  distance: number;
};

export default function ScanNowButton({ workId, useRunId }: { workId: number; useRunId: boolean }) {
  const [state, setState] = useState<ScanState>("idle");
  const [candidates, setCandidates] = useState(0);
  const [filed, setFiled] = useState<FiledClaim[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refresh = useRefreshLicenseHunter();

  const handleScan = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);

    try {
      const body: { workId: number; runId?: string } = { workId };
      if (useRunId) {
        body.runId = crypto.randomUUID();
      }

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        setErrorMessage(data.error || "Scan failed");
        setState("error");
        return;
      }

      const data = await response.json();
      setCandidates(data.candidates);
      setFiled(data.filed);
      setSkipped(data.skipped);
      setErrors(data.errors || []);
      setState("success");
      void refresh();
    } catch (error) {
      setErrorMessage((error as Error).message);
      setState("error");
    }
  }, [workId, useRunId, refresh]);

  if (state === "success") {
    return (
      <div className="glass space-y-3">
        <p className="font-semibold">
          Checked {candidates} candidate image{candidates !== 1 ? "s" : ""} and filed {filed.length} claim{filed.length !== 1 ? "s" : ""}
        </p>
        {filed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Filed claims:</p>
            {filed.map((claim, idx) => (
              <div key={idx} className="text-sm">
                <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="underline">
                  {claim.pageUrl}
                </a>
                {" - "}
                <a href={txLink(claim.hash)} target="_blank" rel="noreferrer" className="underline">
                  View transaction
                </a>
              </div>
            ))}
          </div>
        )}
        {skipped > 0 && <p className="text-sm text-muted-foreground">Skipped {skipped} image{skipped !== 1 ? "s" : ""}</p>}
        {errors.length > 0 && (
          <div className="text-sm text-muted-foreground space-y-1">
            {errors.map((err, idx) => (
              <p key={idx}>{err}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Validators usually decide within 1-2 minutes.</p>
        <Button variant="outline" onClick={() => setState("idle")}>
          Scan again
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="glass space-y-3">
        <p role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
        <Button onClick={() => setState("idle")} variant="outline">
          Try again
        </Button>
      </div>
    );
  }

  return (
    <Button onClick={handleScan} disabled={state === "loading"}>
      {state === "loading" ? "Scanning…" : "Scan now"}
    </Button>
  );
}
