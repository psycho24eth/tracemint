"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

import type { Claim, Work } from "@/lib/contracts/LicenseHunter";
import { formatGen, pageLabel } from "@/lib/format";
import { canonicalUrl } from "@/lib/seo";

/**
 * The gap between a notice existing and a notice being settled is someone sending it. Nothing here
 * emails anybody — a service that mails strangers about copyright on a creator's behalf is exactly
 * the thing this is trying not to be. The creator sends it themselves, and this hands them the link
 * and wording so it reads like a licence offer rather than a threat.
 */
export function SendNotice({ claim, work }: { claim: Claim; work: Work }) {
  const link = canonicalUrl(`/notices/${claim.id}`);
  const message = [
    `Hello — I'm the creator of "${work.title}".`,
    "",
    `An image on ${pageLabel(claim.pageUrl)} matches it. I license my work rather than send takedowns, so here is a licence for that use at ${formatGen(claim.fee)}:`,
    "",
    link,
    "",
    "The page shows both images side by side, the reasoning of the independent validators who reviewed it, and how the price was worked out. You can settle it there in one transaction, or dispute it for free if you already have permission and I've got this wrong.",
  ].join("\n");

  return (
    <section aria-labelledby="send" className="panel">
      <div className="panel-head">
        <h2 id="send" className="t-label text-foreground">
          Send this notice
        </h2>
        <span className="t-label">Only you can see this</span>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          Nothing is sent automatically. Copy the link, or the whole message, and send it however you would normally
          reach the site — their contact form, an email address on the page, or a DM.
        </p>

        <div className="space-y-2">
          <p className="t-label">Link to the notice</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate border border-line bg-muted/40 px-3 py-2 font-mono text-xs">
              {link}
            </code>
            <CopyBlock value={link} label="Copy the notice link" compact />
          </div>
        </div>

        <div className="space-y-2">
          <p className="t-label">A message you can paste</p>
          <pre className="max-h-48 overflow-auto whitespace-pre-wrap border border-line bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
            {message}
          </pre>
          <CopyBlock value={message} label="Copy the message" />
        </div>
      </div>
    </section>
  );
}

function CopyBlock({ value, label, compact = false }: { value: string; label: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  // Clear the confirmation so a second copy still reads as an action rather than an already-done state.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2_000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={copy} aria-label={label} className={compact ? "btn-line shrink-0" : "btn-line"}>
      {copied ? <Check className="h-4 w-4 text-mint" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : compact ? "Copy" : "Copy the message"}
    </button>
  );
}
