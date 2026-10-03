"use client";

import { Check as CheckIcon, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/wallet/CopyButton";
import { pageLabel } from "@/lib/format";
import type { Check } from "@/lib/preflight";

/** Written out for a human reading the page; the contract itself only looks for the address. */
const ownershipLine = (address: string) => `TraceMint wallet: ${address}`;

/** How often the page is looked at again while someone edits it, and when the looking stops. */
const RECHECK_MS = 10_000;
const GIVE_UP_MS = 10 * 60_000;
/** A pause after the link changes, so a link still being typed is not fetched a letter at a time. */
const SETTLE_MS = 800;

export type OwnershipLook =
  | { name: "idle" }
  | { name: "looking" }
  | { name: "missing"; detail: string }
  | { name: "found" }
  | { name: "stopped"; detail: string }
  | { name: "error"; message: string };

/**
 * TraceMint's side of step 1. register_work only succeeds when validators find the creator's address on the page
 * they name, and finding out by failing costs a fee. Asking people to run a check, at the bottom of a long form,
 * lost the ones who had never heard of putting an address on a page. So this loads the page the way validators
 * will as soon as there is a link, and keeps looking while they add the line, until it is there.
 */
export function useOwnershipLook(address: string | null, url: string) {
  const [look, setLook] = useState<OwnershipLook>({ name: "idle" });
  // Check now starts a fresh round, which also gives the looking its full ten minutes again.
  const [round, setRound] = useState(0);

  useEffect(() => {
    if (!address || !/^https:\/\/\S+$/.test(url)) {
      setLook({ name: "idle" });
      return;
    }

    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onShow: (() => void) | undefined;
    const started = Date.now();
    setLook({ name: "looking" });

    const lookLater = (ms: number) => {
      timer = setTimeout(() => {
        // Nobody is editing their page beside a hidden tab, so the next look waits until it is back.
        if (document.visibilityState !== "hidden") return void lookOnce();
        onShow = () => {
          if (document.visibilityState === "hidden" || !onShow) return;
          document.removeEventListener("visibilitychange", onShow);
          onShow = undefined;
          void lookOnce();
        };
        document.addEventListener("visibilitychange", onShow);
      }, ms);
    };

    async function lookOnce() {
      let detail = "TraceMint could not load the page just now.";
      try {
        const response = await fetch("/api/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address, portfolioUrl: url }),
        });
        const body = (await response.json()) as { checks?: Check[]; error?: string };
        if (!live) return;
        if (response.ok) {
          const check = body.checks?.find((item) => item.name === "Ownership proof");
          if (check?.verdict === "pass") return setLook({ name: "found" });
          detail = check?.detail ?? detail;
        } else if (response.status === 429) {
          detail = "TraceMint has had a lot of checks in the last minute, so it is pausing before the next one.";
        } else {
          return setLook({ name: "error", message: body.error ?? "The check could not run." });
        }
      } catch {
        if (!live) return;
      }
      if (Date.now() - started >= GIVE_UP_MS) return setLook({ name: "stopped", detail });
      setLook({ name: "missing", detail });
      lookLater(RECHECK_MS);
    }

    lookLater(SETTLE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
      if (onShow) document.removeEventListener("visibilitychange", onShow);
    };
  }, [address, url, round]);

  return { look, lookAgain: () => setRound((value) => value + 1) };
}

export function OwnershipStep({
  address,
  url,
  onUrlChange,
  look,
  onLookAgain,
}: {
  address: string | null;
  url: string;
  onUrlChange: (url: string) => void;
  look: OwnershipLook;
  onLookAgain: () => void;
}) {
  const page = pageLabel(url);
  const stuck = look.name === "missing" || look.name === "stopped" || look.name === "error";

  return (
    <section aria-labelledby="ownership-step" className="space-y-4 border border-[var(--line-strong)] p-5">
      <div className="space-y-1.5">
        <h3 id="ownership-step" className="t-label text-foreground">
          Step 1 · Prove it&apos;s your art
        </h3>
        <p className="text-sm text-muted-foreground">
          Validators accept a work only when your wallet address is on a page you control. It stops anyone else
          registering your art as theirs, and it takes about a minute.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-foreground">1. Copy your line</p>
        {address ? (
          <div className="flex items-center justify-between gap-2 border border-line bg-background/70 py-1 pl-3 pr-1">
            <code className="truncate font-mono text-xs text-signal">{ownershipLine(address)}</code>
            <CopyButton value={ownershipLine(address)} label="Copy your line" />
          </div>
        ) : (
          <p className="text-muted-foreground">Connect a wallet, or start demo mode, to get your line.</p>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-foreground">2. Put it on a page you control, as plain text anyone can see</p>
        <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
          <li>
            <span className="text-foreground">Your website:</span> paste it into your About or Contact page, then
            publish.
          </li>
          <li>
            <span className="text-foreground">Your portfolio site:</span> add it to your profile&apos;s bio or about
            text and save. The page has to open for someone who isn&apos;t signed in.
          </li>
          <li>
            <span className="text-foreground">No website:</span> make a free{" "}
            <a href="https://gist.github.com/" target="_blank" rel="noreferrer" className="t-link">
              public gist
            </a>{" "}
            on GitHub, paste the line, and press Create public gist.
          </li>
        </ul>
      </div>

      <div className="space-y-2 text-sm">
        <p className="text-foreground">3. Paste that page&apos;s link</p>
        <Label htmlFor="portfolioUrl">Ownership page</Label>
        <Input
          id="portfolioUrl"
          value={url}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://your-site.com/about"
        />
        <p className="text-xs text-muted-foreground">
          TraceMint opens it the way validators will, and keeps looking while you edit.
        </p>
      </div>

      <div aria-live="polite" className="space-y-3 text-sm">
        {look.name === "looking" && (
          <p className="flex items-center gap-2 text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            Looking for your line on {page}…
          </p>
        )}
        {look.name === "found" && (
          <p className="flex items-center gap-2 text-mint">
            <CheckIcon className="size-4" aria-hidden="true" />
            Found your line on {page}. Validators will see it too.
          </p>
        )}
        {look.name === "missing" && (
          <div className="space-y-1">
            <p className="text-foreground">
              Not on {page} yet. Paste your line there and save the page; TraceMint looks again every 10 seconds.
            </p>
            <p className="text-xs text-muted-foreground">{look.detail}</p>
          </div>
        )}
        {look.name === "stopped" && (
          <div className="space-y-1">
            <p className="text-foreground">Stopped looking after 10 minutes. Save your page, then press Check now.</p>
            <p className="text-xs text-muted-foreground">{look.detail}</p>
          </div>
        )}
        {look.name === "error" && (
          <p role="alert" className="text-destructive">
            {look.message}
          </p>
        )}

        {stuck && (
          <div className="space-y-3">
            <button type="button" onClick={onLookAgain} className="btn-line">
              Check now
            </button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Can&apos;t set this up right now?{" "}
              <Link href="/judges" className="t-link">
                Try the whole thing as our demo creator
              </Link>
              , which needs no page and no wallet.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
