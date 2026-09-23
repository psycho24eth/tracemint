"use client";

import { useState, useMemo } from "react";

import { actingAddress, walletOnlyReason } from "@/lib/actor";
import type { Work } from "@/lib/contracts/LicenseHunter";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { addressLink, parseWatchUrls, shortAddress } from "@/lib/format";
import { useWallet } from "@/lib/genlayer/wallet";
import { WriteAction } from "./WriteAction";

export function WatchlistEditor({ work }: { work: Work }) {
  const { role } = useDemoMode();
  const { address } = useWallet();
  const [watchUrlsText, setWatchUrlsText] = useState(work.watchUrls.join("\n"));

  const watchUrls = useMemo(() => parseWatchUrls(watchUrlsText), [watchUrlsText]);

  // The contract keeps the watchlist to the work's creator, so anyone else is told before they spend a fee.
  const notCreator = walletOnlyReason({
    expected: work.creator,
    actor: actingAddress(role, address),
    action: "change this watchlist",
    inDemoMode: role !== null,
  });

  const isValid = useMemo(() => {
    if (watchUrls.length > 10) return false;
    return watchUrls.every((url) => url.startsWith("https://"));
  }, [watchUrls]);

  const errorMessage = useMemo(() => {
    if (watchUrls.length > 10) return "At most 10 watched URLs.";
    if (watchUrls.some((url) => url && !url.startsWith("https://"))) {
      return "All URLs must start with https://.";
    }
    return null;
  }, [watchUrls]);

  return (
    <section className="panel" aria-labelledby={`watchlist-${work.id}`}>
      <div className="panel-head">
        <h2 id={`watchlist-${work.id}`} className="t-label text-foreground">
          Watched URLs
        </h2>
        <span className="t-label">{watchUrls.length} / 10</span>
      </div>
      <div className="space-y-4 p-4">
        <textarea
          value={watchUrlsText}
          onChange={(e) => setWatchUrlsText(e.target.value)}
          placeholder="https://example.com&#10;https://another.com"
          className="t-field"
          rows={4}
          aria-label="Watched URLs, one per line"
        />
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <WriteAction
          method="update_watchlist"
          args={[work.id, watchUrls]}
          label="Save watchlist"
          variant="outline"
          disabled={!isValid}
          unavailable={notCreator}
        />
        {notCreator && (
          <p className="text-xs text-muted-foreground">
            This work was registered by{" "}
            <a href={addressLink(work.creator)} target="_blank" rel="noreferrer" className="t-link">
              {shortAddress(work.creator)}
            </a>
            . You can still scan it for copies — only its watchlist is theirs to edit.
          </p>
        )}
      </div>
    </section>
  );
}
