"use client";

import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { DEMO_ROLE_LABELS, demoAddress } from "@/lib/demo/roles";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";
import { addressLink, siteUrl } from "@/lib/format";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWorks } from "@/lib/hooks/useLicenseHunter";

export default function JudgesPage() {
  const { role, setRole } = useDemoMode();
  const works = useWorks();

  const demoWork = works.data?.find((w) => w.portfolioUrl === siteUrl("/demo/portfolio"));

  return (
    <PageShell>
      <h1 className="mb-8 text-3xl font-bold text-gradient">Verify TraceMint in five minutes</h1>

      <div className="mb-8 space-y-4">
        <div className="flex gap-2">
          {(["creator", "site-owner"] as const).map((demoRole) => (
            <button
              key={demoRole}
              type="button"
              onClick={() => setRole(demoRole)}
              className={`rounded px-4 py-2 transition-colors ${
                role === demoRole
                  ? "bg-accent text-accent-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent/20"
              } ${!demoAddress(demoRole) ? "opacity-50" : ""}`}
              disabled={!demoAddress(demoRole)}
            >
              Act as {DEMO_ROLE_LABELS[demoRole]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 space-y-2 text-sm">
        <div>
          <span className="text-muted-foreground">Contract: </span>
          <Link href={addressLink(getContractAddress())} target="_blank" rel="noreferrer" className="underline">
            {getContractAddress()}
          </Link>
        </div>
        <div className="text-muted-foreground">Studio Next, chain 61997</div>
      </div>

      <div className="mb-8">
        <h2 className="mb-4 font-semibold">Judge path</h2>
        <ol className="space-y-3 list-decimal list-inside">
          <li>
            Switch the role to{" "}
            <button
              type="button"
              onClick={() => setRole("creator")}
              className="underline hover:text-accent"
            >
              Demo creator
            </button>
            {" "}(top bar).
          </li>
          <li>
            Open the demo work{" "}
            {demoWork ? (
              <Link href={`/works/${demoWork.id}`} className="underline hover:text-accent">
                Cybernetic Horizon at /works/{demoWork.id}
              </Link>
            ) : (
              <span className="text-muted-foreground">Cybernetic Horizon</span>
            )}{" "}
            and press "Scan now". Wait 1–2 minutes for validators.
          </li>
          <li>
            The shop claim becomes a notice: COPY_UNLICENSED, ads or merchandise, primary image, 45 GEN. The blog
            claim is COPY_LICENSED, with no notice.
          </li>
          <li>
            Open the notice, switch to{" "}
            <button
              type="button"
              onClick={() => setRole("site-owner")}
              className="underline hover:text-accent"
            >
              Demo site owner
            </button>
            , and pay 45 GEN. A 12-month license is issued.
          </li>
          <li>
            Switch to{" "}
            <button
              type="button"
              onClick={() => setRole("creator")}
              className="underline hover:text-accent"
            >
              Demo creator
            </button>
            , open{" "}
            <Link href="/dashboard" className="underline hover:text-accent">
              Dashboard
            </Link>
            , and see 43.65 GEN withdrawable. Press Withdraw.
          </li>
          <li className="text-muted-foreground">
            Optional: Scan again, then as the site owner{" "}
            <button
              type="button"
              onClick={() => setRole("site-owner")}
              className="underline hover:text-accent"
            >
              dispute
            </button>
            {" "}the new notice with the proof URL{" "}
            <Link href={siteUrl("/demo/permission")} className="underline hover:text-accent">
              {siteUrl("/demo/permission")}
            </Link>
            .
          </li>
        </ol>
      </div>

      <div className="mb-8 space-y-2 text-sm">
        <div className="font-semibold">Demo pages:</div>
        <div className="space-y-1">
          {["/demo/portfolio", "/demo/shop", "/demo/blog", "/demo/permission"].map((path) => (
            <div key={path}>
              <Link href={path} className="underline hover:text-accent">
                {siteUrl(path)}
              </Link>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Demo wallets are server-signed so you can try the flow without installing MetaMask. Fees come out of those
        demo wallets.
      </p>
    </PageShell>
  );
}
