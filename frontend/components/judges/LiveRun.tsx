"use client";

import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { DisputeForm } from "@/components/DisputeForm";
import ScanNowButton from "@/components/ScanNowButton";
import { WriteAction } from "@/components/WriteAction";
import type { Work } from "@/lib/contracts/LicenseHunter";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, demoAddress, type DemoRole } from "@/lib/demo/roles";
import { formatGen, PROMINENCE_LABELS, USAGE_LABELS, VERDICT_LABELS, type Prominence, type Usage } from "@/lib/format";
import { useClaims, useEarnings } from "@/lib/hooks/useLicenseHunter";

type StepState = "done" | "now" | "later";

/**
 * The walkthrough as the thing itself rather than instructions for it. Every step carries the real
 * control, and whether a step is finished is read back off the chain — so the page always agrees
 * with what actually happened, including when someone did a step on another page or a previous visit.
 */
export function LiveRun({ work }: { work: Work }) {
  const { role, setRole } = useDemoMode();
  const claims = useClaims(work.id);
  const creatorAddress = demoAddress("creator");
  const earnings = useEarnings(creatorAddress);

  const filed = claims.data ?? [];
  const notice = filed.find((claim) => claim.status === "NOTICE_ISSUED");
  const paid = filed.find((claim) => claim.status === "PAID");
  const settled = paid !== undefined;
  const owed = earnings.data ?? 0n;

  const steps: { key: string; title: string; state: StepState; needs?: DemoRole; body: ReactNode }[] = [
    {
      key: "scan",
      title: "Scan for copies",
      state: filed.length > 0 ? "done" : "now",
      needs: "creator",
      body:
        filed.length > 0 ? (
          <Settled>
            {filed.length} claim{filed.length === 1 ? "" : "s"} on chain for this work.
          </Settled>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              The agent fetches the two demo pages and files a claim for each image it thinks matches. Validators then
              decide, which takes a minute or two — the timer shows which consensus step they are on.
            </p>
            <ScanNowButton workId={work.id} useRunId />
          </>
        ),
    },
    {
      key: "verdicts",
      title: "Read the verdicts",
      // A claim is only written once file_claim has recorded its verdict, so one existing means it was judged.
      state: filed.length === 0 ? "later" : "done",
      body:
        filed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Runs as soon as the scan above files its claims.</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Straight from the contract. The shop page is a product listing, so it is charged as commercial use on a
              main image; the blog credits the licence, so it is not charged at all.
            </p>
            <ul className="grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)]">
              {filed.map((claim) => (
                <li key={claim.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 bg-background px-4 py-3 text-sm">
                  <Link href={`/notices/${claim.id}`} className="t-link font-mono text-xs">
                    #{claim.id}
                  </Link>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{claim.pageUrl.replace(/^https?:\/\//, "")}</span>
                  <span className={claim.status === "NO_NOTICE" ? "text-mint" : "text-signal"}>
                    {VERDICT_LABELS[claim.verdict]}
                  </span>
                  <span className="font-mono tabular-nums">
                    {claim.fee > 0n ? formatGen(claim.fee) : "no fee"}
                  </span>
                </li>
              ))}
            </ul>
            {notice && (
              <p className="mt-3 text-xs text-muted-foreground">
                Notice #{notice.id}: {USAGE_LABELS[notice.usage as Usage]} use,{" "}
                {PROMINENCE_LABELS[notice.prominence as Prominence].toLowerCase()} placement, {formatGen(notice.fee)}.
              </p>
            )}
          </>
        ),
    },
    {
      key: "pay",
      title: "Pay the licence",
      state: settled ? "done" : notice ? "now" : "later",
      needs: "site-owner",
      body: settled ? (
        <Settled>
          Licence issued for {formatGen(paid.fee)}.{" "}
          <Link href={`/notices/${paid.id}`} className="t-link">
            Open notice #{paid.id}
          </Link>
        </Settled>
      ) : notice ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            This is the site owner&apos;s side of the trade. In real use they would arrive from the link in the notice
            and never see this page — here you can just switch to their wallet.
          </p>
          <WriteAction
            method="pay_license"
            args={[notice.id]}
            value={notice.fee}
            label={`Pay ${formatGen(notice.fee)} and get a licence`}
          />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Waits for a notice. If the validators found nothing, scan again.</p>
      ),
    },
    {
      key: "withdraw",
      title: "Withdraw the earnings",
      state: !settled ? "later" : owed === 0n ? "done" : "now",
      needs: "creator",
      body: !settled ? (
        <p className="text-sm text-muted-foreground">Waits for a paid licence.</p>
      ) : owed === 0n ? (
        <Settled>Nothing left to withdraw — the creator&apos;s balance is empty.</Settled>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            The contract credited the creator 97% of that fee the moment the payment was accepted. Nobody has to
            approve the withdrawal.
          </p>
          <p className="mb-4 font-mono text-2xl text-mint">{formatGen(owed)} waiting</p>
          <WriteAction method="withdraw_earnings" args={[]} label={`Withdraw ${formatGen(owed)}`} />
        </>
      ),
    },
    {
      key: "dispute",
      title: "Optional: dispute a notice",
      state: notice ? "now" : "later",
      needs: "site-owner",
      body: notice ? (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            The other way out. Give the permission letter as proof and the validators judge the dispute the same way
            they judged the claim. Use{" "}
            <Link href="/demo/permission" className="t-link break-all">
              the demo permission page
            </Link>{" "}
            as the proof URL.
          </p>
          <DisputeForm claim={notice} />
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Needs an open notice. Scan again after paying the first one and a fresh notice appears to dispute.
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <RoleBar role={role} setRole={setRole} />

      <ol className="grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)]">
        {steps.map((step, index) => (
          <li key={step.key} className="bg-background">
            <div className="grid gap-4 p-5 md:grid-cols-[4rem_1fr] md:gap-6 md:p-6">
              <div className="flex items-center gap-3 md:flex-col md:items-start">
                <span
                  className={`display-wide text-3xl leading-none ${
                    step.state === "done" ? "text-mint" : step.state === "now" ? "text-signal" : "text-muted-foreground/40"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <StateChip state={step.state} />
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-baseline gap-3">
                  <h3 className="display-condensed text-3xl md:text-4xl">{step.title}</h3>
                  {step.needs && <span className="t-label">{DEMO_ROLE_LABELS[step.needs]}&apos;s move</span>}
                </div>

                {step.state === "now" && step.needs && role !== step.needs ? (
                  <WrongRole needs={step.needs} role={role} onSwitch={() => setRole(step.needs!)} />
                ) : (
                  step.body
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StateChip({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="chip chip-mint">
        <span className="sr-only">Step </span>Done
      </span>
    );
  }
  if (state === "now") return <span className="chip chip-signal">Your turn</span>;
  return <span className="chip">Waiting</span>;
}

function Settled({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 border-l-2 border-mint/60 pl-3 text-sm">
      <Check className="mt-0.5 h-4 w-4 shrink-0 text-mint" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** A step belonging to the other side. One button, and it says what it is doing rather than doing it quietly. */
function WrongRole({ needs, role, onSwitch }: { needs: DemoRole; role: DemoRole | null; onSwitch: () => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {role ? `You are acting as the ${DEMO_ROLE_LABELS[role].toLowerCase()}.` : "No demo role is active."} This step
        is the {DEMO_ROLE_LABELS[needs].toLowerCase()}&apos;s.
      </p>
      <button type="button" onClick={onSwitch} className="btn-signal">
        Act as {DEMO_ROLE_LABELS[needs]}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function RoleBar({ role, setRole }: { role: DemoRole | null; setRole: (role: DemoRole | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-[var(--line-strong)] p-3">
      <span className="t-label mr-1">Acting as</span>
      {(["creator", "site-owner"] as const).map((demoRole) => (
        <button
          key={demoRole}
          type="button"
          onClick={() => setRole(demoRole)}
          disabled={!demoAddress(demoRole)}
          aria-pressed={role === demoRole}
          className={`border px-4 py-2 text-xs uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
            role === demoRole ? "border-signal bg-signal text-background" : "border-line hover:border-signal hover:text-signal"
          }`}
        >
          {DEMO_ROLE_LABELS[demoRole]}
        </button>
      ))}
    </div>
  );
}

/** Shown while the demo work is still being read off the chain. */
export function LiveRunLoading() {
  return (
    <p className="flex items-center gap-2 border border-[var(--line-strong)] p-6 text-sm text-muted-foreground">
      <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Reading the demo work from the contract…
    </p>
  );
}
