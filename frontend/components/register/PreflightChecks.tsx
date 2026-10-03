"use client";

import { AlertTriangle, Check as CheckIcon, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";

import { blocking, type Check, type CheckVerdict, type PreflightResult } from "@/lib/preflight";

type Run =
  | { name: "idle" }
  | { name: "checking" }
  | { name: "done"; checks: Check[] }
  | { name: "failed"; message: string };

const TONE: Record<CheckVerdict, { chip: string; label: string; Icon: typeof CheckIcon }> = {
  pass: { chip: "chip-mint", label: "Pass", Icon: CheckIcon },
  fail: { chip: "chip-alert", label: "Fail", Icon: X },
  warn: { chip: "chip-signal", label: "Check this", Icon: AlertTriangle },
};

/**
 * The image half of the checks that run before a fee; the ownership page has its own live check in step 1.
 * register_work never loads the image, so a broken link registers without complaint and then fails every
 * judgment, because validators load it each time they compare it with a copy. So it is checked here first.
 */
export function PreflightChecks({
  imageUrl,
  onResult,
}: {
  imageUrl: string;
  onResult: (state: { checked: boolean; blocked: boolean }) => void;
}) {
  const [run, setRun] = useState<Run>({ name: "idle" });

  const ready = imageUrl.startsWith("https://");

  // Editing the URL invalidates the answer, so the gate closes again rather than going stale.
  useEffect(() => {
    setRun({ name: "idle" });
  }, [imageUrl]);

  const checks = run.name === "done" ? run.checks : [];
  const blockers = blocking(checks);

  useEffect(() => {
    onResult({ checked: run.name === "done", blocked: blockers.length > 0 });
  }, [run.name, blockers.length, onResult]);

  async function check() {
    setRun({ name: "checking" });
    try {
      const response = await fetch("/api/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const body = (await response.json()) as PreflightResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "The check could not run.");
      setRun({ name: "done", checks: body.checks });
    } catch (error) {
      setRun({ name: "failed", message: (error as Error).message });
    }
  }

  return (
    <section aria-labelledby="preflight" className="border border-[var(--line-strong)]">
      <div className="panel-head">
        <h3 id="preflight" className="t-label text-foreground">
          <ShieldCheck className="mr-2 inline size-3.5 align-[-2px]" aria-hidden="true" />
          Check your image
        </h3>
        {run.name === "done" && (
          <span className={`chip ${blockers.length > 0 ? "chip-alert" : "chip-mint"}`}>
            {blockers.length > 0 ? "Image would fail" : "Image ready"}
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Validators load your image every time they judge a copy, so it has to open for anyone and be the image file
          itself. This checks it now, for free.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={check} disabled={!ready || run.name === "checking"} className="btn-line">
            {run.name === "checking" ? (
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {run.name === "checking" ? "Checking…" : run.name === "done" ? "Check again" : "Run the check"}
          </button>
          {!ready && <span className="text-xs text-muted-foreground">Fill in the image URL first.</span>}
        </div>

        {run.name === "failed" && (
          <p role="alert" className="text-sm text-destructive">
            {run.message}
          </p>
        )}

        {run.name === "done" && (
          <ul className="grid gap-px bg-[var(--line-strong)]" aria-live="polite">
            {checks.map((item) => {
              const tone = TONE[item.verdict];
              return (
                <li key={item.name} className="space-y-1.5 bg-background p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <tone.Icon
                      className={`size-4 shrink-0 ${
                        item.verdict === "pass" ? "text-mint" : item.verdict === "fail" ? "text-destructive" : "text-signal"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-foreground">{item.name}</span>
                    <span className={`chip ${tone.chip}`}>{tone.label}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.detail}</p>
                  {item.fix && <p className="border-l-2 border-line pl-3 text-xs text-muted-foreground">{item.fix}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
