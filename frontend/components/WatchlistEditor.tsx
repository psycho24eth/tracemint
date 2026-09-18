"use client";

import { useState, useMemo } from "react";

import { parseWatchUrls } from "@/lib/format";
import type { Work } from "@/lib/contracts/LicenseHunter";
import { WriteAction } from "./WriteAction";

export function WatchlistEditor({ work }: { work: Work }) {
  const [watchUrlsText, setWatchUrlsText] = useState(work.watchUrls.join("\n"));

  const watchUrls = useMemo(() => parseWatchUrls(watchUrlsText), [watchUrlsText]);

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
        <WriteAction method="update_watchlist" args={[work.id, watchUrls]} label="Save watchlist" variant="outline" disabled={!isValid} />
      </div>
    </section>
  );
}
