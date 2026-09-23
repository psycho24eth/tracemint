import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import { Reveal } from "@/components/hero/Reveal";
import { CopyButton } from "@/components/wallet/CopyButton";
import { addressLink, shortAddress } from "@/lib/format";
import { NETWORK_SHORT_NAME } from "@/lib/genlayer/connection";
import { GENLAYER_CHAIN_ID } from "@/lib/genlayer/network";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const REPO = "https://github.com/psycho24eth/tracemint";

type Column = { heading: string; links: { label: string; href: string; external?: boolean }[] };

const COLUMNS: Column[] = [
  {
    heading: "Product",
    links: [
      { label: "Registered works", href: "/works" },
      { label: "Notices issued", href: "/notices" },
      { label: "Your dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Questions and answers", href: "/faq" },
      { label: "Verify in five minutes", href: "/judges" },
    ],
  },
  {
    heading: "Protocol",
    links: [
      { label: "Contract source", href: `${REPO}/blob/main/contracts/license_hunter.py`, external: true },
      { label: "Source on GitHub", href: REPO, external: true },
      { label: "GenLayer docs", href: "https://docs.genlayer.com", external: true },
    ],
  },
];

function ColumnLinks({ column }: { column: Column }) {
  return (
    <nav aria-label={column.heading} className="space-y-3">
      <p className="t-label text-foreground">{column.heading}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {column.links.map((link) => (
          <li key={`${column.heading}-${link.label}`}>
            {link.external ? (
              <a href={link.href} target="_blank" rel="noreferrer" className="t-link">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="t-link">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <Reveal className="md:col-span-4" delay={0}>
            <div className="flex items-center gap-3">
              <LogoMark size="2.25rem" />
              <span className="display-wide text-lg leading-none">
                TRACEMINT<span className="text-signal">/</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              An agent finds copies of registered art, GenLayer validators judge each one against the creator's terms,
              and the site owner settles with an on-chain licence. Every step is a transaction anyone can audit.
            </p>
            <dl className="mt-6 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="live-dot" aria-hidden="true" />
                <dt className="t-label">Network</dt>
                <dd className="whitespace-nowrap">
                  {NETWORK_SHORT_NAME} · chain {GENLAYER_CHAIN_ID}
                </dd>
              </div>
              {CONTRACT_ADDRESS && (
                <div className="flex items-center gap-2">
                  <dt className="t-label">Contract</dt>
                  <dd className="flex items-center gap-1.5">
                    <a href={addressLink(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="t-link font-mono">
                      {shortAddress(CONTRACT_ADDRESS)}
                    </a>
                    <CopyButton value={CONTRACT_ADDRESS} label="Copy the contract address" />
                  </dd>
                </div>
              )}
            </dl>
          </Reveal>

          <div className="grid gap-10 sm:grid-cols-3 md:col-span-8">
            {COLUMNS.map((column, index) => (
              <Reveal key={column.heading} delay={80 + index * 80}>
                <ColumnLinks column={column} />
              </Reveal>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} TraceMint · Built on GenLayer</p>
          <p className="max-w-xl md:text-right">
            Notices are automated findings reached by validator consensus, not legal advice. Fees and terms are set by
            the creator who registered the work.
          </p>
        </div>
      </div>

      {/* The wordmark is drawn as an outline and lit by a slow sweep, so the footer has one moving thing, not four. */}
      <div className="footer-mark" aria-hidden="true">
        <p className="display-condensed footer-mark-outline">TRACEMINT</p>
        <p className="display-condensed footer-mark-sweep">
          TRACEMINT
        </p>
      </div>
    </footer>
  );
}
