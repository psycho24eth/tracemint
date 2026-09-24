"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { txLink } from "@/lib/format";
import { useRefreshLicenseHunter } from "@/lib/hooks/useLicenseHunter";
import { outcomeMessage, STILL_WAITING_MESSAGE, waitForDemoTx } from "@/lib/tx";
import { advance, FIRST_ROUND, slowest, stageLabel, type Progress } from "@/lib/validator-stages";
import { Button } from "./ui/button";
import { ValidatorTimer, type Settled, type Verdict } from "./ValidatorTimer";

type ScanState = "idle" | "loading" | "success" | "error";

type FiledClaim = {
  hash: string;
  pageUrl: string;
  imageUrl: string;
  distance: number;
};

type ClaimOutcome = { text: string; verdict: Verdict };

const DECIDED: ClaimOutcome = { text: "Decided. See the result under Claims below.", verdict: "accepted" };
const STILL_WAITING: ClaimOutcome = { text: STILL_WAITING_MESSAGE, verdict: "unknown" };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * What the scan did, in words. Matching nothing is the ordinary outcome — most watched pages are
 * clean — so the message has to name the work that was done. "Checked 0 candidate images and filed
 * 0 claims" counted matches, not images, and so read as a broken agent rather than an honest result.
 */
export function scanSummary(result: { examined: number; pagesRead: number; candidates: number; filed: number }): string {
  const { examined, pagesRead, candidates, filed } = result;
  const pages = `${pagesRead} page${pagesRead === 1 ? "" : "s"}`;
  const images = `${examined} image${examined === 1 ? "" : "s"}`;

  if (pagesRead === 0) return "No watched page could be read. Check the addresses below, or add one.";
  if (examined === 0) return `Read ${pages} and found no images on ${pagesRead === 1 ? "it" : "them"}.`;
  if (candidates === 0) return `Compared ${images} across ${pages}. None was close enough to your work to claim.`;
  if (filed === 0) return `Matched ${candidates} of ${images} across ${pages}, all already claimed.`;
  return `Compared ${images} across ${pages}, matched ${candidates}, and filed ${filed} claim${filed === 1 ? "" : "s"}.`;
}

export default function ScanNowButton({ workId, useRunId }: { workId: number; useRunId: boolean }) {
  const [state, setState] = useState<ScanState>("idle");
  const [candidates, setCandidates] = useState(0);
  const [looked, setLooked] = useState({ examined: 0, pagesRead: 0 });
  const [filed, setFiled] = useState<FiledClaim[]>([]);
  const [outcomes, setOutcomes] = useState<Record<string, ClaimOutcome>>({});
  const [stages, setStages] = useState<Record<string, Progress>>({});
  const [batch, setBatch] = useState<{ startedAt: number; settled?: Settled } | null>(null);
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
          onStatus: (update) => {
            if (current()) {
              setStages((previous) => ({ ...previous, [hash]: advance(previous[hash] ?? FIRST_ROUND, update.status) }));
            }
          },
        });
        const problem = status.decided ? outcomeMessage(status) : null;
        if (problem) {
          outcome = { text: problem, verdict: "problem" };
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

  useEffect(() => {
    if (filed.length === 0 || !filed.every((claim) => outcomes[claim.hash])) return;
    const verdicts = filed.map((claim) => outcomes[claim.hash].verdict);
    const verdict: Verdict = verdicts.includes("problem") ? "problem" : verdicts.includes("unknown") ? "unknown" : "accepted";
    setBatch((previous) => (previous && !previous.settled ? { ...previous, settled: { at: Date.now(), verdict } } : previous));
  }, [filed, outcomes]);

  const handleScan = useCallback(async () => {
    const run = ++scanRun.current;
    setState("loading");
    setErrorMessage(null);
    setOutcomes({});
    setStages({});
    setBatch(null);
    setLooked({ examined: 0, pagesRead: 0 });

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
      setLooked({ examined: data.examined ?? 0, pagesRead: data.pagesRead ?? 0 });
      setFiled(data.filed);
      setSkipped(data.skipped);
      setErrors(data.errors || []);
      setState("success");
      if (data.filed.length > 0) setBatch({ startedAt: Date.now() });
      void refresh();
      for (const claim of data.filed as FiledClaim[]) void track(claim.hash, run);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setState("error");
    }
  }, [workId, useRunId, refresh, track]);

  if (state === "success") {
    return (
      <div className="space-y-3">
        <p className="font-semibold">
          {scanSummary({ ...looked, candidates, filed: filed.length })}
        </p>
        {candidates === 0 && looked.examined > 0 && (
          <p className="text-sm text-muted-foreground">
            That is the normal result for a page that has not copied your work. Nothing was charged, and you can scan
            again whenever you add a page.
          </p>
        )}
        {filed.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Filed claims:</p>
            <ul className="space-y-2" aria-live="polite">
              {filed.map((claim) => {
                const outcome = outcomes[claim.hash];
                return (
                  <li key={claim.hash} className="text-sm">
                    <a href={claim.pageUrl} target="_blank" rel="noreferrer" className="t-link">
                      {claim.pageUrl}
                    </a>
                    {" - "}
                    <a href={txLink(claim.hash)} target="_blank" rel="noreferrer" className="t-link">
                      View transaction
                    </a>
                    <p className={outcome?.verdict === "problem" ? "text-destructive" : "text-muted-foreground"}>
                      {outcome?.text ??
                        (stages[claim.hash] ? `${stageLabel(stages[claim.hash])}…` : "Validators are judging this claim…")}
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
        {batch && (
          <ValidatorTimer
            startedAt={batch.startedAt}
            progress={slowest(filed.map((claim) => stages[claim.hash] ?? FIRST_ROUND))}
            settled={batch.settled}
          />
        )}
        <Button variant="outline" onClick={() => setState("idle")}>
          Scan again
        </Button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="space-y-3">
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
