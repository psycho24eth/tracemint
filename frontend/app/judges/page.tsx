"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { DemoAccessPanel } from "@/components/demo/DemoAccessPanel";
import { LiveRun, LiveRunLoading } from "@/components/judges/LiveRun";
import { PageShell } from "@/components/PageShell";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { DEMO_ROLE_LABELS, DEMO_ROLE_SUMMARY } from "@/lib/demo/roles";
import { addressLink, siteUrl } from "@/lib/format";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

const DEMO_PAGES = [
  { path: "/demo/portfolio", label: "Creator portfolio", note: "Ownership proof" },
  { path: "/demo/shop", label: "Neon Threads shop", note: "Unlicensed copy" },
  { path: "/demo/blog", label: "Synthwave blog", note: "Licensed copy" },
  { path: "/demo/permission", label: "Permission letter", note: "Dispute proof" },
];

function AccessForm() {
  const { unlock } = useDemoMode();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await unlock(code.trim());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="panel flex flex-wrap items-end gap-4 p-5">
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="t-label text-foreground/80">Judge access code</span>
        <input
          id="judge-access-code"
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          className="t-field"
          placeholder="From the submission"
        />
      </label>
      <button type="submit" disabled={busy || !code.trim()} className="btn-signal">
        {busy ? "Checking…" : "Unlock and start"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

export default function JudgesPage() {
  const { accessCode, exit } = useDemoMode();
  const works = useWorks();
  const contract = getContractAddress();
  const demoWork = works.data?.find((work) => work.portfolioUrl === siteUrl("/demo/portfolio"));

  return (
    <PageShell>
      <header className="mb-10 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          For judges
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">
          {accessCode ? "Run it yourself" : "Verify TraceMint in five minutes"}
        </h1>
        {accessCode ? (
          <p className="max-w-2xl text-muted-foreground">
            Every control below is the real one, and every tick is read back off the contract — so the page always
            agrees with what actually happened on chain. Work down the list; it tells you whose turn each step is and
            switches wallets for you in one click.
          </p>
        ) : (
          <p className="max-w-2xl text-muted-foreground">
            No wallet needed. Enter the access code from the submission, or get a fresh demo code, and the whole flow
            runs on this page — scan, verdicts, payment, payout, dispute. Every action is a real transaction on
            GenLayer Studio Next.
          </p>
        )}
      </header>

      {!accessCode ? (
        <div className="space-y-10">
          <div className="grid max-w-4xl items-start gap-4 md:grid-cols-2">
            <AccessForm />
            <DemoAccessPanel className="bg-background/60" />
          </div>

          <section aria-labelledby="roles" className="max-w-3xl space-y-4">
            <h2 id="roles" className="t-label text-foreground">
              The two wallets you will be given
            </h2>
            <dl className="grid gap-px border border-line bg-[var(--line-strong)] text-sm sm:grid-cols-2">
              {(["creator", "site-owner"] as const).map((demoRole) => (
                <div key={demoRole} className="bg-background p-4">
                  <dt className="t-label text-foreground">{DEMO_ROLE_LABELS[demoRole]}</dt>
                  <dd className="mt-1 text-muted-foreground">{DEMO_ROLE_SUMMARY[demoRole]}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">
              A licence needs both sides, so the walkthrough funds both wallets and lets you switch between them. In
              real use nobody switches: a creator connects their own wallet, and a site owner arrives from the link in
              the notice and pays from theirs. Demo mode exists so one person can see the whole flow without owning two
              funded wallets.
            </p>
          </section>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
            {demoWork ? <LiveRun work={demoWork} /> : <LiveRunLoading />}
          </div>

          <aside className="space-y-4">
            <div className="panel space-y-3 p-5 text-sm">
              <h2 className="t-label text-foreground">Contract</h2>
              <a
                href={addressLink(contract)}
                target="_blank"
                rel="noreferrer"
                className="t-link block break-all text-xs text-signal"
              >
                {contract}
              </a>
              <p className="text-muted-foreground">Studio Next, chain 61997</p>
            </div>

            <div className="panel space-y-3 p-5">
              <h2 className="t-label text-foreground">Evidence pages</h2>
              <nav className="space-y-2" aria-label="Evidence pages">
                {DEMO_PAGES.map(({ path, label, note }) => (
                  <Link
                    key={path}
                    href={path}
                    className="flex items-center justify-between border border-line px-3 py-2 text-sm transition-colors hover:border-signal"
                  >
                    <span>
                      <span className="block font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{note}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </Link>
                ))}
              </nav>
            </div>

            <p className="px-1 text-xs text-muted-foreground">
              Demo wallets are server-signed so you can try the flow without installing MetaMask. Fees come out of
              those demo wallets.
            </p>

            <button
              type="button"
              onClick={exit}
              className="px-1 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Exit demo mode
            </button>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
