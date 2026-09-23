"use client";

import { useCallback, useState } from "react";

import { PreflightChecks } from "@/components/register/PreflightChecks";
import { useActingAddress } from "@/lib/demo/DemoModeProvider";
import { formatDate, parseGen, parseWatchUrls } from "@/lib/format";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { WriteAction } from "./WriteAction";

export function validateWork(fields: {
  title: string;
  imageUrl: string;
  portfolioUrl: string;
  basePriceText: string;
  terms: string;
  watchUrlsText: string;
}): string | null {
  if (fields.title.length < 1 || fields.title.length > 120) {
    return "Title must be 1-120 characters.";
  }

  if (!fields.imageUrl.startsWith("https://") || fields.imageUrl.includes(" ")) {
    return "The image URL must start with https:// and contain no spaces.";
  }

  if (!fields.portfolioUrl.startsWith("https://") || fields.portfolioUrl.includes(" ")) {
    return "The portfolio URL must start with https:// and contain no spaces.";
  }

  let basePrice: bigint;
  try {
    basePrice = parseGen(fields.basePriceText);
  } catch (error) {
    return (error as Error).message;
  }

  if (basePrice <= 0n) {
    return "Base price must be above zero.";
  }

  if (fields.terms.length > 500) {
    return "Terms must be at most 500 characters.";
  }

  const watchUrls = parseWatchUrls(fields.watchUrlsText);
  if (watchUrls.length > 10) {
    return "At most 10 watched URLs.";
  }

  for (const url of watchUrls) {
    if (!url.startsWith("https://")) {
      return "All watched URLs must start with https://.";
    }
  }

  return null;
}

export default function RegisterWorkForm() {
  const actingAddress = useActingAddress();
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [basePriceText, setBasePriceText] = useState("10");
  const [terms, setTerms] = useState("Non-exclusive web license, 12 months");
  const [watchUrlsText, setWatchUrlsText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [preflight, setPreflight] = useState({ checked: false, blocked: false });
  const [override, setOverride] = useState(false);

  const onPreflight = useCallback((state: { checked: boolean; blocked: boolean }) => {
    setPreflight(state);
    if (!state.blocked) setOverride(false);
  }, []);

  const fields = { title, imageUrl, portfolioUrl, basePriceText, terms, watchUrlsText };

  const handleBeforeSubmit = (): boolean => {
    const validationError = validateWork(fields);
    if (validationError) {
      setError(validationError);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSuccess = () => {
    setTitle("");
    setImageUrl("");
    setPortfolioUrl("");
    setBasePriceText("10");
    setTerms("Non-exclusive web license, 12 months");
    setWatchUrlsText("");
    setError(null);
    setPreflight({ checked: false, blocked: false });
    setOverride(false);
  };

  let basePriceWei = 0n;
  try {
    basePriceWei = parseGen(basePriceText);
  } catch {
    basePriceWei = 0n;
  }

  const watchUrls = parseWatchUrls(watchUrlsText);

  const args = [title, imageUrl, portfolioUrl, basePriceWei, terms, watchUrls];

  return (
    <section className="panel" aria-labelledby="register-work-heading">
      <div className="panel-head">
        <h2 id="register-work-heading" className="t-label text-foreground">
          Register a work
        </h2>
        <span className="t-label">Ownership checked by validators</span>
      </div>

      <div className="space-y-5 p-5">
        {actingAddress && (
          <div className="space-y-2 border-l-2 border-signal pl-4 text-sm">
            <p>
              Put this address in the visible text of your portfolio page:{" "}
              <code className="break-all text-signal">{actingAddress}</code>
            </p>
            <p className="text-muted-foreground">
              That is how the contract proves the work is yours — it loads the page and looks for the address, so it
              has to be a page you can edit. A stock-photo listing or someone else&apos;s gallery will not work.
            </p>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Work title" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="basePrice">Base price (GEN)</Label>
            <Input id="basePrice" value={basePriceText} onChange={(e) => setBasePriceText(e.target.value)} placeholder="10" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/artwork.jpg" />
            <p className="text-xs text-muted-foreground">
              A direct link to the image file itself, not the page it sits on.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="portfolioUrl">Portfolio URL</Label>
            <Input id="portfolioUrl" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-site.com/about" />
            <p className="text-xs text-muted-foreground">
              A page you control, showing the address above in its text.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="terms">Terms</Label>
            <textarea
              id="terms"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="License terms"
              className="t-field"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="watchUrls">Watched URLs (one per line)</Label>
            <textarea
              id="watchUrls"
              value={watchUrlsText}
              onChange={(e) => setWatchUrlsText(e.target.value)}
              placeholder="https://example.com&#10;https://another.com"
              className="t-field"
              rows={3}
            />
          </div>
        </div>

        <PreflightChecks
          address={actingAddress}
          portfolioUrl={portfolioUrl}
          imageUrl={imageUrl}
          onResult={onPreflight}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* A failed check means the contract would refuse the call, so the fee is spent for nothing. */}
        <WriteAction
          method="register_work"
          args={args}
          label="Register work"
          unavailable={
            preflight.blocked && !override
              ? "The ownership check above would fail, and the contract charges a fee before refusing. Fix it and check again."
              : null
          }
          onBeforeSubmit={handleBeforeSubmit}
          onSuccess={handleSuccess}
        />

        {preflight.blocked && !override && (
          <button
            type="button"
            onClick={() => setOverride(true)}
            className="text-xs uppercase tracking-[0.12em] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Register anyway — my page builds its text with JavaScript
          </button>
        )}
      </div>
    </section>
  );
}
