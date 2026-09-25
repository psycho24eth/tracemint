"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { BEATS, POINT, recordHref, type Beat } from "@/lib/start/story";

/**
 * The walkthrough reveals one beat at a time and keeps the earlier ones on screen, so the story builds
 * into something you can scroll back through rather than a slideshow that throws each page away.
 *
 * Nothing here writes to the chain and nothing needs a wallet: it retells a case the contract already
 * holds, and every beat that states a figure links to the record it came from.
 */

function Art({ art }: { art: NonNullable<Beat["art"]> }) {
  return (
    <ul className={`mt-5 grid gap-px bg-[var(--line-strong)] ${art.length > 1 ? "sm:grid-cols-2" : ""}`}>
      {art.map((image) => (
        <li key={image.src} className="bg-background">
          {image.caption && <p className="t-label px-3 pt-3">{image.caption}</p>}
          {/* Plain <img>, as everywhere else in this app: these are the exact files the robot compared. */}
          <img src={image.src} alt={image.alt} className="aspect-[4/3] w-full object-cover p-3" />
        </li>
      ))}
    </ul>
  );
}

function BeatBlock({ beat, index, showRecord }: { beat: Beat; index: number; showRecord: boolean }) {
  return (
    <section aria-labelledby={`beat-${beat.id}`} className="border-t border-line pt-8 first:border-t-0 first:pt-0">
      <p className="t-label">
        <span className="t-index mr-2">{String(index + 1).padStart(2, "0")}</span>
        Step {index + 1} of {BEATS.length}
      </p>

      <h2 id={`beat-${beat.id}`} className="display-wide mt-3 text-balance text-3xl normal-case leading-tight sm:text-4xl">
        {beat.title}
      </h2>

      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">{beat.body}</p>

      {beat.quote && (
        <blockquote className="mt-5 max-w-2xl border-l-2 border-signal pl-4">
          <p className="text-base leading-relaxed">“{beat.quote}”</p>
          <footer className="t-label mt-2">The judges, in their own words</footer>
        </blockquote>
      )}

      {beat.art && <Art art={beat.art} />}

      {beat.claimId !== undefined && showRecord && (
        <p className="mt-4 text-xs text-muted-foreground">
          Don&apos;t take our word for it —{" "}
          <Link href={recordHref(beat.claimId)} className="t-link">
            read the full record
          </Link>{" "}
          of this one: both pictures, the reasoning, and the sums.
        </p>
      )}
    </section>
  );
}

/** The first beat to rest on each record, so the citation appears once rather than under every beat. */
const firstCitation = new Map<number, string>();
for (const beat of BEATS) {
  if (beat.claimId !== undefined && !firstCitation.has(beat.claimId)) firstCitation.set(beat.claimId, beat.id);
}

export function Storyboard() {
  const [shown, setShown] = useState(1);
  const finished = shown >= BEATS.length;
  const current = BEATS[Math.min(shown, BEATS.length) - 1];

  return (
    <div className="mt-10">
      <div className="space-y-8" aria-live="polite">
        {BEATS.slice(0, shown).map((beat, index) => (
          <BeatBlock
            key={beat.id}
            beat={beat}
            index={index}
            showRecord={beat.claimId !== undefined && firstCitation.get(beat.claimId) === beat.id}
          />
        ))}
      </div>

      {!finished && current.next && (
        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button type="button" size="lg" onClick={() => setShown((count) => count + 1)}>
            {current.next}
          </Button>
          {/* A judge or a second-time visitor should not have to click through seven beats to reach the end. */}
          <button
            type="button"
            onClick={() => setShown(BEATS.length)}
            className="text-xs uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Show me the rest at once
          </button>
        </div>
      )}

      {finished && (
        <section aria-labelledby="the-point" className="mt-10 border-t border-line pt-8">
          <h2 id="the-point" className="display-wide text-balance text-3xl normal-case leading-tight sm:text-4xl">
            {POINT.title}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">{POINT.body}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/works#register">Do this with my own picture</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/how-it-works">How it works underneath</Link>
            </Button>
          </div>

          <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Adding your own picture needs a wallet and costs a small fee, because it is written into a public record
            that nobody, including us, can quietly edit later. Everything you just read is already in there.
          </p>
        </section>
      )}
    </div>
  );
}
