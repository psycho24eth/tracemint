"use client";

import { useState, useMemo } from "react";

import { parseWatchUrls } from "@/lib/format";
import type { Work } from "@/lib/contracts/LicenseHunter";
import { WriteAction } from "./WriteAction";

export function WatchlistEditor({ work }: { work: Work }) {
  const [watchUrlsText, setWatchUrlsText] = useState(work.watchUrls.join("\n"));
  const [error, setError] = useState<string | null>(null);

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
    <div className="glass space-y-4">
      <h3 className="font-bold">Watched URLs</h3>
      <textarea
        value={watchUrlsText}
        onChange={(e) => {
          setWatchUrlsText(e.target.value);
          setError(null);
        }}
        placeholder="https://example.com&#10;https://another.com"
        className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
        rows={4}
      />
      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
      <WriteAction
        method="update_watchlist"
        args={[work.id, watchUrls]}
        label="Save watchlist"
        disabled={!isValid}
        onBeforeSubmit={() => {
          setError(null);
          return true;
        }}
      />
    </div>
  );
}
