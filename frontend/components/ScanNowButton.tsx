"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { txLink } from "@/lib/format";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import { outcomeMessage, STILL_WAITING_MESSAGE, waitForDemoTx } from "@/lib/tx";
import { Button } from "./ui/button";

type ScanState = "idle" | "loading" | "success" | "error";

type FiledClaim = {
  hash: string;
  pageUrl: string;
  imageUrl: string;
  distance: number;
};

type ClaimOutcome = { text: string; problem: boolean };

const DECIDED: ClaimOutcome = { text: "Decided. See the result under Claims below.", problem: false };
const STILL_WAITING: ClaimOutcome = { text: STILL_WAITING_MESSAGE, problem: false };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ScanNowButton({ workId, useRunId }: { workId: number; useRunId: boolean }) {
  const [state, setState] = useState<ScanState>("idle");
  const [candidates, setCandidates] = useState(0);
  const [filed, setFiled] = useState<FiledClaim[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, ClaimOutcome>>({});
  const [skipped, setSkipped] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const refresh = useRefreshLicenseHunter();
  // Numbers each scan so polling for a replaced scan, or after the page closes, stops at its next wait.
  const scanRun = useRef(0);

  useEffect(
    () => () => {
      scanRun.current += 1;
    },
    [],
  );

  const track = useCallback(
    async (hash: string, run: number) => {
      const current = () => scanRun.current === run;
      let outcome = STILL_WAITING;
      try {
        const status = await waitForDemoTx(hash, {
          wait: (ms) => (current() ? pause(ms) : Promise.reject(new Error("The scan was replaced."))),
        });
        const problem = status.decided ? outcomeMessage(status) : null;
        if (problem) {
          outcome = { text: problem, problem: true };
        } else if (status.decided) {
          outcome = DECIDED;
          void refresh();
        }
      } catch {
        // Status lookups failed; the claims list below keeps refreshing on its own.
      }
      if (current()) setOutcomes((previous) => ({ ...previous, [hash]: outcome }));
    },
    [refresh],
  );

  const handleScan = useCallback(async () => {
    const run = ++scanRun.current;
    setState("loading");
    setErrorMessage(null);
    setOutcomes({});

    try {
      const body: { workId: number; runId?: string } = { workId };
      if (useRunId) {
        body.runId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
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
      for (const claim of data.filed as FiledClaim[]) void track(claim.hash, run);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setState("error");
    }
  }, [workId, useRunId, refresh, track]);

  if (state === "success") {
    return (
      <div className="glass space-y-3">
        <p className="font-semibold">
          Checked {candidates} candidate image{candidates !== 1 ? "s" : ""} and filed {filed.length} claim{filed.length !== 1 ? "s" : ""}
        </p>
        {filed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Filed claims:</p>
            <ul className="space-y-2" aria-live="polite">
              {filed.map((claim) => {
                const outcome = outcomes[claim.hash];
                return (
                  <li key={claim.hash} className="text-sm">
                    <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="underline">
                      {claim.pageUrl}
                    </a>
                    {" - "}
                    <a href={txLink(claim.hash)} target="_blank" rel="noreferrer" className="underline">
                      View transaction
                    </a>
                    <p className={outcome?.problem ? "text-destructive" : "text-muted-foreground"}>
                      {outcome?.text ?? "Validators are judging this claim…"}
                    </p>
                  </li>
                );
              })}
            </ul>
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
