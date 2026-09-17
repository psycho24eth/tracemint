"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { PageShell } from "@/components/PageShell";
import { DEMO_ROLE_LABELS, demoAddress } from "@/lib/demo/roles";
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
    <li className="glass relative flex gap-4 p-5">
      <span className="font-[family-name:var(--font-display)] text-3xl font-bold leading-none text-gradient">
        {String(index).padStart(2, "0")}
      </span>
      <div className="space-y-2">
        <h3 className="text-base">{title}</h3>
        <div className="text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
        {expect && (
          <p className="flex items-start gap-2 text-sm text-foreground">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
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
      className="font-medium text-accent underline-offset-4 hover:underline"
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
      className="glass flex max-w-xl flex-wrap items-end gap-3 p-5"
    >
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
        <span className="font-medium">Judge access code</span>
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="off"
          className="rounded-md border border-white/15 bg-transparent px-3 py-2 outline-none focus:border-accent"
          placeholder="From the submission"
        />
      </label>
      <button
        type="submit"
        disabled={busy || !code.trim()}
        className="btn-gradient rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-50"
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
      <header className="mb-10 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          For judges
        </p>
        <h1 className="text-3xl leading-tight md:text-5xl text-gradient">
          Verify TraceMint in five minutes
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          No wallet needed. Enter the access code from the submission to unlock
          two funded demo roles, then follow the steps. Every action is a real
          transaction on GenLayer Studio Next.
        </p>
        {!accessCode ? (
          <AccessForm />
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {(["creator", "site-owner"] as const).map((demoRole) => (
              <button
                key={demoRole}
                type="button"
                onClick={() => setRole(demoRole)}
                disabled={!demoAddress(demoRole)}
                className={`rounded-full border px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  role === demoRole
                    ? "border-transparent bg-accent text-accent-foreground"
                    : "border-white/15 hover:border-accent/60"
                }`}
              >
                Act as {DEMO_ROLE_LABELS[demoRole]}
              </button>
            ))}
            <button
              type="button"
              onClick={exit}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Exit judge mode
            </button>
          </div>
        )}
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ol className="space-y-4">
          <Step index={1} title="Unlock judge mode">
            Enter the access code above, then act as{" "}
            <RoleLink role="creator">Demo creator</RoleLink>. The judge bar
            under the menu shows the active role.
          </Step>
          <Step
            index={2}
            title="Scan for copies"
            expect="Two claims are filed; validators judge them in 1–2 minutes."
          >
            Open the demo work{" "}
            {demoWork ? (
              <Link
                href={`/works/${demoWork.id}`}
                className="font-medium text-accent underline-offset-4 hover:underline"
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
              className="font-medium text-accent underline-offset-4 hover:underline"
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
              className="break-all text-accent underline-offset-4 hover:underline"
            >
              {siteUrl("/demo/permission")}
            </Link>
            .
          </Step>
        </ol>

        <aside className="space-y-4">
          <div className="glass space-y-2 p-5 text-sm">
            <h2 className="text-sm">Contract</h2>
            <Link
              href={addressLink(contract)}
              target="_blank"
              rel="noreferrer"
              className="block break-all font-mono text-xs text-accent hover:underline"
            >
              {contract}
            </Link>
            <p className="text-muted-foreground">Studio Next, chain 61997</p>
          </div>

          <div className="glass space-y-3 p-5">
            <h2 className="text-sm">Evidence pages</h2>
            <nav className="space-y-2" aria-label="Evidence pages">
              {DEMO_PAGES.map(({ path, label, note }) => (
                <Link
                  key={path}
                  href={path}
                  className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm transition-colors hover:border-accent/60"
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
