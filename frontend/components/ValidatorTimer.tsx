"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { stageLabel, VALIDATOR_STAGES, type Progress, type Stage } from "@/lib/validator-stages";

// The window the copy promises, and how far the track runs before it stops growing.
const USUAL_FROM = 60;
const USUAL_TO = 120;
const TRACK_TO = 180;

/** How a transaction ended: accepted, decided against it, or left without a decision at all. */
export type Verdict = "accepted" | "problem" | "unknown";

/** When the waiting stopped, and what it stopped at. */
export type Settled = { at: number; verdict: Verdict };

const TONE: Record<Verdict, string> = {
  accepted: "text-mint",
  problem: "text-destructive",
  unknown: "text-signal",
};

const FILL: Record<Verdict, string> = {
  accepted: "bg-mint",
  problem: "bg-destructive",
  unknown: "bg-signal",
};

export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

/** Seconds since `startedAt`, ticking once a second until a settled time freezes it. */
function useElapsed(startedAt: number, frozenAt?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (frozenAt !== undefined) return;
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [frozenAt]);
  return Math.max(0, Math.round(((frozenAt ?? now) - startedAt) / 1_000));
}

const percent = (seconds: number) => Math.min(seconds / TRACK_TO, 1) * 100;
const band = (seconds: number) => `${(seconds / TRACK_TO) * 100}%`;

/**
 * A live clock for the wait that a visitor otherwise has to take on faith: how long validators have
 * been at it, how that compares with the usual minute or two, and which consensus step they are on.
 * The steps are tappable, so anyone curious about GenLayer can read what each one does.
 */
export function ValidatorTimer({
  startedAt,
  progress,
  settled,
  compact = false,
  children,
}: {
  startedAt: number;
  progress: Progress;
  settled?: Settled;
  /** A single row, for places that already show a consensus timeline of their own. */
  compact?: boolean;
  children?: ReactNode;
}) {
  const elapsed = useElapsed(startedAt, settled?.at);
  const [picked, setPicked] = useState<Stage | null>(null);
  const overtime = !settled && elapsed > USUAL_TO;
  const shown = picked ?? progress.stage;
  const tone = settled ? TONE[settled.verdict] : overtime ? "text-signal" : "text-foreground";
  const headline = settled
    ? settled.verdict === "unknown"
      ? `Still undecided after ${clock(elapsed)}`
      : `Decided in ${clock(elapsed)}`
    : stageLabel(progress);

  const meter = (
    <div className="relative h-1 w-full bg-[var(--line)]" aria-hidden="true">
      <div
        className="absolute inset-y-0 bg-[var(--line-strong)]"
        style={{ left: band(USUAL_FROM), width: band(USUAL_TO - USUAL_FROM) }}
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear motion-reduce:transition-none",
          settled ? FILL[settled.verdict] : overtime ? "bg-signal" : "bg-foreground/70",
        )}
        style={{ width: `${percent(elapsed)}%` }}
      />
    </div>
  );

  // A timer that announced itself every second would be unbearable; the stage line below is the live region.
  const timeRead = (size: string) => (
    <span role="timer" aria-live="off" className={cn("font-mono tabular-nums", size, tone)}>
      {clock(elapsed)}
    </span>
  );

  if (compact) {
    return (
      <div className="space-y-1.5 border border-line px-3 py-2">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-2">
            {!settled && <span className="live-dot shrink-0" aria-hidden="true" />}
            <span role="status" className={cn("truncate", settled ? tone : "text-muted-foreground")}>
              {headline}
            </span>
          </span>
          {timeRead("text-xs")}
        </div>
        {meter}
        {children && <p className="text-xs text-muted-foreground">{children}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 border border-line p-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="t-label flex items-center gap-2">
          {!settled && <span className="live-dot" aria-hidden="true" />}
          {settled ? "Consensus" : "Waiting for validators"}
        </p>
        {timeRead("text-2xl")}
      </div>

      {meter}
      <div className="flex justify-between">
        <span className="t-label text-[0.625rem]">0:00</span>
        <span className={cn("t-label text-[0.625rem]", !settled && !overtime && elapsed >= USUAL_FROM && "text-foreground")}>
          usual 1–2 min
        </span>
        <span className={cn("t-label text-[0.625rem]", overtime && "text-signal")}>3:00+</span>
      </div>

      <p role="status" className={cn("text-sm", tone)}>
        {headline}
      </p>

      <ol className="grid grid-cols-2 gap-px bg-[var(--line)] sm:grid-cols-4">
        {VALIDATOR_STAGES.map((stage, index) => {
          const finished = settled !== undefined && settled.verdict !== "unknown";
          const done = finished || index < progress.stage;
          const active = !settled && index === progress.stage;
          return (
            <li key={stage.name}>
              <button
                type="button"
                onClick={() => setPicked(picked === index ? null : (index as Stage))}
                aria-expanded={shown === index}
                className={cn(
                  "flex h-full w-full items-center gap-1.5 bg-background px-2 py-2 text-left transition-colors hover:bg-muted",
                  shown === index && "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 shrink-0 rounded-full",
                    done ? "bg-mint" : active ? "bg-signal" : "bg-[var(--line-strong)]",
                    active && "live-dot",
                  )}
                  aria-hidden="true"
                />
                <span className={cn("t-label", (done || active) && "text-foreground")}>{stage.name}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <p className="text-xs text-muted-foreground">{VALIDATOR_STAGES[shown].detail}</p>
      {overtime && (
        <p className="text-xs text-signal">
          Longer than usual. Validators are still working, and nothing is lost while you wait.
        </p>
      )}
      {children && <p className="text-xs text-muted-foreground">{children}</p>}
    </div>
  );
}
