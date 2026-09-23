"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { DemoAccessPanel } from "@/components/demo/DemoAccessPanel";
import { PageShell } from "@/components/PageShell";
import { DEMO_ROLE_LABELS, DEMO_ROLE_SUMMARY, demoAddress } from "@/lib/demo/roles";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { addressLink, siteUrl } from "@/lib/format";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

const DEMO_PAGES = [
  {
    path: "/demo/portfolio",
    label: "Creator portfolio",
    note: "Ownership proof",
  },
  { path: "/demo/shop", label: "Neon Threads shop", note: "Unlicensed copy" },
  { path: "/demo/blog", label: "Synthwave blog", note: "Licensed copy" },
  {
    path: "/demo/permission",
    label: "Permission letter",
    note: "Dispute proof",
  },
];

function Step({
  index,
  title,
  expect,
  children,
}: {
  index: number;
  title: string;
  expect?: string;
  children: ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[3.5rem_1fr] gap-4 border-b border-line py-6 last:border-b-0 md:grid-cols-[5rem_1fr]">
      <span className="display-wide text-3xl leading-none text-signal md:text-4xl">
        {String(index).padStart(2, "0")}
      </span>
      <div className="space-y-2">
        <h3 className="display-condensed text-3xl md:text-4xl">{title}</h3>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
        {expect && (
          <p className="flex items-start gap-2 border-l-2 border-mint/60 pl-3 text-sm text-foreground">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-mint"
              aria-hidden="true"
            />
            {expect}
          </p>
        )}
      </div>
    </li>
  );
}

function RoleLink({
  role,
  children,
}: {
  role: "creator" | "site-owner";
  children: ReactNode;
}) {
  const { setRole } = useDemoMode();
  return (
    <button
      type="button"
      onClick={() => setRole(role)}
      className="font-medium text-signal underline-offset-4 hover:underline"
    >
      {children}
    </button>
  );
}

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
    <form
      onSubmit={submit}
      className="panel flex flex-wrap items-end gap-4 p-5"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="t-label text-foreground/80">Judge access code</span>
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          className="t-field"
          placeholder="From the submission"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="btn-signal"
      >
        {busy ? "Checking…" : "Unlock demo roles"}
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
  const { role, setRole, accessCode, exit } = useDemoMode();
  const works = useWorks();
  const contract = getContractAddress();
  const demoWork = works.data?.find(
    (w) => w.portfolioUrl === siteUrl("/demo/portfolio"),
  );

  return (
    <PageShell>
      <header className="mb-12 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          For judges
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">
          Verify TraceMint in five minutes
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          No wallet needed. Enter the access code from the submission, or get
          a fresh demo code, to unlock two funded demo roles, then follow the
          steps. Every action is a real transaction on GenLayer Studio Next.
        </p>
        {!accessCode ? (
          <div className="grid max-w-4xl items-start gap-4 md:grid-cols-2">
            <AccessForm />
            <DemoAccessPanel className="bg-background/60" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {(["creator", "site-owner"] as const).map((demoRole) => (
                <button
                  key={demoRole}
                  type="button"
                  onClick={() => setRole(demoRole)}
                  disabled={!demoAddress(demoRole)}
                  className={`border px-5 py-2.5 text-xs uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
                    role === demoRole
                      ? "border-signal bg-signal text-background"
                      : "border-line hover:border-signal hover:text-signal"
                  }`}
                >
                  Act as {DEMO_ROLE_LABELS[demoRole]}
                </button>
              ))}
              <button
                type="button"
                onClick={exit}
                className="px-3 py-2 text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
              >
                Exit demo mode
              </button>
            </div>
            <dl className="grid max-w-3xl gap-px border border-line bg-[var(--line-strong)] text-sm sm:grid-cols-2">
              {(["creator", "site-owner"] as const).map((demoRole) => (
                <div key={demoRole} className="bg-background p-4">
                  <dt className="t-label text-foreground">{DEMO_ROLE_LABELS[demoRole]}</dt>
                  <dd className="mt-1 text-muted-foreground">{DEMO_ROLE_SUMMARY[demoRole]}</dd>
                </div>
              ))}
            </dl>
            <p className="max-w-3xl text-sm text-muted-foreground">
              A licence needs both sides, so the walkthrough funds both wallets and lets you switch between them. In
              real use nobody switches: a creator connects their own wallet, and a site owner arrives from the link in
              the notice and pays from theirs. Demo mode exists so one person can see the whole flow without owning two
              funded wallets.
            </p>
          </div>
        )}
      </header>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <ol className="border-t border-line">
          <Step index={1} title="Unlock demo mode">
            Enter the access code above or get a demo code, then act as{" "}
            <RoleLink role="creator">Demo creator</RoleLink>. The demo bar
            under the menu shows the active role.
          </Step>
          <Step
            index={2}
            title="Scan for copies"
            expect="Two claims are filed, and the page follows each one until validators decide (1–2 minutes). If they can't agree on a claim, nothing is recorded: press Scan again."
          >
            Open the demo work{" "}
            {demoWork ? (
              <Link
                href={`/works/${demoWork.id}`}
                className="t-link font-medium text-foreground"
              >
                Cybernetic Horizon at /works/{demoWork.id}
              </Link>
            ) : (
              <span>Cybernetic Horizon</span>
            )}{" "}
            and press &quot;Scan now&quot;.
          </Step>
          <Step
            index={3}
            title="Read the verdicts"
            expect="The shop claim becomes a notice: COPY_UNLICENSED, ads or merchandise, primary image, 45 GEN."
          >
            The blog claim is COPY_LICENSED, with no notice, because the blog
            credits the license.
          </Step>
          <Step
            index={4}
            title="Pay the license"
            expect="A 12-month license is issued."
          >
            Open the notice, switch to{" "}
            <RoleLink role="site-owner">Demo site owner</RoleLink>, and pay 45
            GEN.
          </Step>
          <Step
            index={5}
            title="Withdraw royalties"
            expect="43.65 GEN reaches the creator wallet once the withdrawal finalizes."
          >
            Switch to <RoleLink role="creator">Demo creator</RoleLink>, open{" "}
            <Link
              href="/dashboard"
              className="t-link font-medium text-foreground"
            >
              Dashboard
            </Link>
            , and press Withdraw.
          </Step>
          <Step index={6} title="Optional: dispute a notice">
            Scan again, then as the site owner{" "}
            <RoleLink role="site-owner">dispute</RoleLink> the new notice with
            the proof URL{" "}
            <Link
              href={siteUrl("/demo/permission")}
              className="t-link break-all text-foreground"
            >
              {siteUrl("/demo/permission")}
            </Link>
            .
          </Step>
        </ol>

        <aside className="space-y-4">
          <div className="panel space-y-3 p-5 text-sm">
            <h2 className="t-label text-foreground">Contract</h2>
            <Link
              href={addressLink(contract)}
              target="_blank"
              rel="noreferrer"
              className="t-link block break-all text-xs text-signal"
            >
              {contract}
            </Link>
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
                    <span className="block text-xs text-muted-foreground">
                      {note}
                    </span>
                  </span>
                  <ExternalLink
                    className="h-4 w-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </nav>
          </div>

          <p className="px-1 text-xs text-muted-foreground">
            Demo wallets are server-signed so you can try the flow without
            installing MetaMask. Fees come out of those demo wallets.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
