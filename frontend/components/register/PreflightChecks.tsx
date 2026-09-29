"use client";

import { AlertTriangle, Check as CheckIcon, LoaderCircle, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/wallet/CopyButton";
import { blocking, type Check, type CheckVerdict, type PreflightResult } from "@/lib/preflight";

/** Named by the contract's own ownership rule, and the only failure with somewhere else to go. */
const OWNERSHIP_CHECK = "Ownership proof";

/** Written out for a human reading the portfolio page; the check itself only looks for the address. */
const ownershipLine = (address: string) => `TraceMint wallet: ${address}`;

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
 * register_work runs an ownership check inside the transaction: it renders the portfolio page and
 * requires the creator's address to be in the text. Before this existed, getting that wrong cost a
 * fee and a wait and then said only that the contract had refused — with an explorer link that does
 * not show the reason either. So the same checks run here first, and say pass or fail.
 */
export function PreflightChecks({
  address,
  portfolioUrl,
  imageUrl,
  onResult,
}: {
  address: string | null;
  portfolioUrl: string;
  imageUrl: string;
  onResult: (state: { checked: boolean; blocked: boolean }) => void;
}) {
  const [run, setRun] = useState<Run>({ name: "idle" });

  const ready = address !== null && portfolioUrl.startsWith("https://") && imageUrl.startsWith("https://");

  // Editing either URL invalidates the answer, so the gate closes again rather than going stale.
  useEffect(() => {
    setRun({ name: "idle" });
  }, [address, portfolioUrl, imageUrl]);

  const checks = run.name === "done" ? run.checks : [];
  const blockers = blocking(checks);
  // The one failure nobody can act on from the message alone: it needs a page, and they may have none.
  const ownershipFailed = checks.some((item) => item.name === OWNERSHIP_CHECK && item.verdict === "fail");

  useEffect(() => {
    onResult({ checked: run.name === "done", blocked: blockers.length > 0 });
  }, [run.name, blockers.length, onResult]);

  async function check() {
    setRun({ name: "checking" });
    try {
      const response = await fetch("/api/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, portfolioUrl, imageUrl }),
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
          Check before you pay a fee
        </h3>
        {run.name === "done" && (
          <span className={`chip ${blockers.length > 0 ? "chip-alert" : "chip-mint"}`}>
            {blockers.length > 0 ? "Would be rejected" : "Ready to register"}
          </span>
        )}
      </div>

      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Registering costs a fee, and the ownership check runs only after you have paid it — so a portfolio page
          missing your address costs you the fee and still gets refused. This runs the same check first, for free.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={check} disabled={!ready || run.name === "checking"} className="btn-line">
            {run.name === "checking" ? (
              <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {run.name === "checking" ? "Checking…" : run.name === "done" ? "Check again" : "Run the check"}
          </button>
          {!ready && (
            <span className="text-xs text-muted-foreground">
              {address === null ? "Connect a wallet first." : "Fill in both URLs first."}
            </span>
          )}
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

        {ownershipFailed && address && (
          <div className="space-y-4 border-l-2 border-destructive/60 pl-4">
            <div className="space-y-2">
              <p className="text-sm text-foreground">Put this line on a page you control, then check again:</p>
              <div className="flex items-center justify-between gap-2 border border-line bg-background/70 py-1 pl-3 pr-1">
                <code className="truncate font-mono text-xs text-signal">{ownershipLine(address)}</code>
                <CopyButton value={ownershipLine(address)} label="Copy the line to paste" />
              </div>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              No website of your own? A{" "}
              <a href="https://gist.github.com/" target="_blank" rel="noreferrer" className="t-link">
                public gist
              </a>{" "}
              is a page you control and takes about a minute. Paste the line, create it, then put the gist&apos;s
              address in Portfolio URL above.
            </p>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Or set nothing up yet and{" "}
              <Link href="/judges" className="t-link">
                try the whole thing as our demo creator
              </Link>
              , which needs no page and no wallet.
            </p>
          </div>
        )}

        {run.name === "done" && blockers.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Fix the failures above and check again. This reads the page the same way the reviewers will, but a page
            that builds its text with JavaScript can still differ — if you are sure the address is visible, you can
            register anyway below.
          </p>
        )}
      </div>
    </section>
  );
}
