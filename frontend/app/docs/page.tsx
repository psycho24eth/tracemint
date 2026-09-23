import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/PageShell";
import { CopyButton } from "@/components/wallet/CopyButton";
import { EXPLORER_URL, PROMINENCE_BPS, PROMINENCE_LABELS, USAGE_BPS, USAGE_LABELS, addressLink } from "@/lib/format";
import { GENLAYER_CHAIN, GENLAYER_CHAIN_ID, GENLAYER_NETWORK } from "@/lib/genlayer/network";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Developer docs",
  description:
    "The TraceMint contract interface on GenLayer: write and view methods, who may call each one, the fee formula, verdicts and statuses, the limits, and how to run the stack locally.",
  path: "/docs",
});

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
const REPO = "https://github.com/psycho24eth/tracemint";
const CONTRACT_SOURCE = `${REPO}/blob/main/contracts/license_hunter.py`;

type Method = { signature: string; caller: string; does: string };

const WRITES: Method[] = [
  {
    signature: "register_work(title, image_url, portfolio_url, base_price, terms, watch_urls) → work_id",
    caller: "Anyone",
    does: "Registers a work. Fetches portfolio_url and requires the sender's address to appear on it, so a work can only be registered by someone who controls the page it lives on.",
  },
  {
    signature: "update_watchlist(work_id, watch_urls)",
    caller: "The work's creator",
    does: "Replaces the list of pages the agent watches. Up to ten HTTPS URLs.",
  },
  {
    signature: "file_claim(work_id, page_url, image_url) → claim_id",
    caller: "The creator, or the registered agent",
    does: "Runs the judgement and records the result. Rejects a page and image pair that has already been claimed for that work, so the same copy cannot be noticed twice.",
  },
  {
    signature: "pay_license(claim_id) → license_id",
    caller: "Anyone, payable",
    does: "Settles a notice. The value sent must equal the fee exactly. Credits 97% to the creator, keeps 3%, and writes a licence valid for one year.",
  },
  {
    signature: "dispute(claim_id, proof_url) → verdict",
    caller: "The wallet printed on the page, if there was one",
    does: "Re-runs the judgement with the proof URL included. A successful dispute withdraws the notice; an unsuccessful one marks it dispute rejected.",
  },
  {
    signature: "withdraw_earnings() → amount",
    caller: "Any creator with a balance",
    does: "Sends the caller their full credited balance. Reverts when the balance is zero.",
  },
  {
    signature: "withdraw_protocol_fees(to) → amount",
    caller: "The contract owner",
    does: "Sends the accumulated protocol share to an address.",
  },
  {
    signature: "set_agent(agent)",
    caller: "The contract owner",
    does: "Sets the one address allowed to file claims on a creator's behalf.",
  },
];

const VIEWS: Method[] = [
  { signature: "get_work(work_id) → dict", caller: "—", does: "One work, with its creator, price, terms and watchlist." },
  { signature: "list_works() → list", caller: "—", does: "Every registered work." },
  { signature: "get_claim(claim_id) → dict", caller: "—", does: "One claim: verdict, reasoning, usage, prominence, fee, status." },
  { signature: "list_claims(work_id) → list", caller: "—", does: "Every claim filed against one work, including the ones that found nothing." },
  { signature: "list_notices() → list", caller: "—", does: "Only the claims that became notices." },
  { signature: "get_license(license_id) → dict", caller: "—", does: "One licence: the claim it settles, the licensee, the amount, the expiry." },
  { signature: "list_licenses(licensee) → list", caller: "—", does: "Every licence one address holds." },
  { signature: "get_earnings(creator) → int", caller: "—", does: "A creator's withdrawable balance in wei." },
  { signature: "get_stats() → dict", caller: "—", does: "Counts and totals, including the protocol balance." },
];

const LIMITS = [
  { name: "Watched pages per work", value: "10" },
  { name: "Title", value: "120 characters" },
  { name: "Terms", value: "500 characters" },
  { name: "Page text read by the judge", value: "4,000 characters" },
  { name: "Portfolio page read for proof", value: "50,000 characters" },
  { name: "Image size", value: "5 MB" },
  { name: "Reasoning stored per claim", value: "600 characters" },
  { name: "Licence term", value: "31,536,000 seconds — one year" },
];

const VERDICTS = [
  { code: "COPY_UNLICENSED", means: "A copy, and the terms do not cover it. This is the only verdict that becomes a notice with a fee." },
  { code: "COPY_LICENSED", means: "A copy, but the creator's own terms allow this use. No fee." },
  { code: "DIFFERENT_WORK", means: "Not the registered work. No fee." },
  { code: "UNCLEAR", means: "The validators could not decide. Nothing is charged and the agent can try again." },
];

const STATUSES = [
  { code: "NOTICE_ISSUED", means: "A notice is open and unpaid." },
  { code: "NO_NOTICE", means: "The claim was judged and did not warrant a notice." },
  { code: "PAID", means: "Settled. A licence exists for this use." },
  { code: "WITHDRAWN", means: "A dispute succeeded and the notice was dropped." },
  { code: "DISPUTE_REJECTED", means: "A dispute was judged and failed. The notice stands." },
];

function MethodTable({ rows, showCaller = true }: { rows: Method[]; showCaller?: boolean }) {
  return (
    <div className="overflow-x-auto border border-[var(--line-strong)]">
      <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--line-strong)]">
            <th scope="col" className="t-label px-4 py-3 font-normal">
              Method
            </th>
            {showCaller && (
              <th scope="col" className="t-label px-4 py-3 font-normal">
                Who may call it
              </th>
            )}
            <th scope="col" className="t-label px-4 py-3 font-normal">
              What it does
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.signature} className="border-b border-line last:border-b-0">
              <td className="px-4 py-3 align-top font-mono text-xs text-foreground">{row.signature}</td>
              {showCaller && <td className="whitespace-nowrap px-4 py-3 align-top text-xs text-signal">{row.caller}</td>}
              <td className="px-4 py-3 align-top text-muted-foreground">{row.does}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DocsPage() {
  return (
    <PageShell>
      <header className="mb-14 space-y-6">
        <p className="t-label">
          <span className="t-index mr-2">00</span>
          Developer docs
        </p>
        <h1 className="display-condensed max-w-4xl text-6xl md:text-8xl">
          The contract,
          <br />
          in full
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          TraceMint is one intelligent contract written in GenLayer&apos;s Python SDK, one TypeScript agent that finds
          candidate copies, and this front end. Everything below is read off the deployed contract — if the page and
          the chain disagree, the chain is right.{" "}
          <a href={CONTRACT_SOURCE} target="_blank" rel="noreferrer" className="t-link">
            Read the source
          </a>
          .
        </p>
      </header>

      <section aria-labelledby="network" className="mb-16">
        <h2 id="network" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">01</span>
          Network
        </h2>
        <dl className="grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] sm:grid-cols-2">
          <div className="space-y-1 bg-background p-4">
            <dt className="t-label">Chain</dt>
            <dd className="font-mono text-sm">
              {GENLAYER_CHAIN.name} · {GENLAYER_CHAIN_ID}
            </dd>
          </div>
          <div className="space-y-1 bg-background p-4">
            <dt className="t-label">Currency</dt>
            <dd className="font-mono text-sm">{GENLAYER_CHAIN.nativeCurrency.symbol} — free from the faucet in the app</dd>
          </div>
          <div className="space-y-1 bg-background p-4">
            <dt className="t-label">RPC</dt>
            <dd className="break-all font-mono text-sm">{GENLAYER_NETWORK.rpcUrls[0]}</dd>
          </div>
          <div className="space-y-1 bg-background p-4">
            <dt className="t-label">Explorer</dt>
            <dd className="break-all font-mono text-sm">
              <a href={EXPLORER_URL} target="_blank" rel="noreferrer" className="t-link">
                {EXPLORER_URL.replace("https://", "")}
              </a>
            </dd>
          </div>
          {CONTRACT_ADDRESS && (
            <div className="space-y-1 bg-background p-4 sm:col-span-2">
              <dt className="t-label">Contract</dt>
              <dd className="flex items-center gap-2">
                <a
                  href={addressLink(CONTRACT_ADDRESS)}
                  target="_blank"
                  rel="noreferrer"
                  className="t-link break-all font-mono text-sm"
                >
                  {CONTRACT_ADDRESS}
                </a>
                <CopyButton value={CONTRACT_ADDRESS} label="Copy the contract address" />
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section aria-labelledby="writes" className="mb-16">
        <h2 id="writes" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">02</span>
          Write methods
        </h2>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Every write is a transaction that goes through consensus. The three that call a model —{" "}
          <span className="font-mono text-xs">file_claim</span>,{" "}
          <span className="font-mono text-xs">dispute</span> and the portfolio check inside{" "}
          <span className="font-mono text-xs">register_work</span> — take a minute or two, because each validator
          repeats the work before voting.
        </p>
        <MethodTable rows={WRITES} />
      </section>

      <section aria-labelledby="views" className="mb-16">
        <h2 id="views" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">03</span>
          View methods
        </h2>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Free, instant, and open to anyone. This front end is built entirely on these — there is no private index and
          no server holding state you cannot read yourself.
        </p>
        <MethodTable rows={VIEWS} showCaller={false} />
      </section>

      <section aria-labelledby="fee" className="mb-16">
        <h2 id="fee" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">04</span>
          The fee formula
        </h2>
        <div className="border border-[var(--line-strong)] p-6">
          <p className="font-mono text-sm leading-relaxed">
            <span className="text-signal">fee</span> = base_price
            <span className="mx-2 text-muted-foreground">×</span>
            usage
            <span className="mx-2 text-muted-foreground">×</span>
            prominence
          </p>
          <p className="mt-2 font-mono text-sm leading-relaxed">
            <span className="text-mint">creator</span> = fee × 0.97
            <span className="mx-3 text-muted-foreground">|</span>
            <span className="text-signal">protocol</span> = fee × 0.03
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <dl className="space-y-2">
              <dt className="t-label text-foreground">usage</dt>
              {(Object.keys(USAGE_BPS) as (keyof typeof USAGE_BPS)[]).map((key) => (
                <dd key={key} className="flex justify-between gap-4 border-b border-line pb-1 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{key}</span>
                  <span className="text-muted-foreground">{USAGE_LABELS[key]}</span>
                  <span className="font-mono tabular-nums text-signal">× {Number(USAGE_BPS[key]) / 10_000}</span>
                </dd>
              ))}
            </dl>
            <dl className="space-y-2">
              <dt className="t-label text-foreground">prominence</dt>
              {(Object.keys(PROMINENCE_BPS) as (keyof typeof PROMINENCE_BPS)[]).map((key) => (
                <dd key={key} className="flex justify-between gap-4 border-b border-line pb-1 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{key}</span>
                  <span className="text-muted-foreground">{PROMINENCE_LABELS[key]}</span>
                  <span className="font-mono tabular-nums text-signal">× {Number(PROMINENCE_BPS[key]) / 10_000}</span>
                </dd>
              ))}
            </dl>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            All arithmetic is integer basis points in the contract, so there is no rounding argument. The worked
            example is on{" "}
            <Link href="/pricing" className="t-link">
              pricing
            </Link>
            .
          </p>
        </div>
      </section>

      <section aria-labelledby="enums" className="mb-16">
        <h2 id="enums" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">05</span>
          Verdicts and statuses
        </h2>
        <div className="grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] md:grid-cols-2">
          <div className="bg-background p-6">
            <h3 className="t-label mb-4 text-foreground">Verdict — what the validators decided</h3>
            <dl className="space-y-3">
              {VERDICTS.map((item) => (
                <div key={item.code} className="border-b border-line pb-3">
                  <dt className="font-mono text-xs text-signal">{item.code}</dt>
                  <dd className="text-sm text-muted-foreground">{item.means}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="bg-background p-6">
            <h3 className="t-label mb-4 text-foreground">Status — where the claim stands</h3>
            <dl className="space-y-3">
              {STATUSES.map((item) => (
                <div key={item.code} className="border-b border-line pb-3">
                  <dt className="font-mono text-xs text-mint">{item.code}</dt>
                  <dd className="text-sm text-muted-foreground">{item.means}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section aria-labelledby="limits" className="mb-16">
        <h2 id="limits" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">06</span>
          Limits
        </h2>
        <p className="mb-6 max-w-2xl text-muted-foreground">
          Set in the contract, not in the interface, so they hold however you call it.
        </p>
        <dl className="grid gap-px border border-[var(--line-strong)] bg-[var(--line-strong)] sm:grid-cols-2 lg:grid-cols-4">
          {LIMITS.map((limit) => (
            <div key={limit.name} className="space-y-1 bg-background p-4">
              <dt className="t-label">{limit.name}</dt>
              <dd className="font-mono text-sm">{limit.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="local" className="mb-16">
        <h2 id="local" className="t-label mb-5 text-foreground">
          <span className="t-index mr-2">07</span>
          Run it yourself
        </h2>
        <div className="space-y-4 border border-[var(--line-strong)] p-6">
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li>
              <span className="t-index mr-2">01</span>
              Clone{" "}
              <a href={REPO} target="_blank" rel="noreferrer" className="t-link">
                the repository
              </a>{" "}
              and copy <span className="font-mono text-xs text-foreground">frontend/.env.example</span> to{" "}
              <span className="font-mono text-xs text-foreground">frontend/.env.development.local</span>.
            </li>
            <li>
              <span className="t-index mr-2">02</span>
              Fill in the contract address and the network values above. The keys prefixed{" "}
              <span className="font-mono text-xs text-foreground">NEXT_PUBLIC_</span> are safe in a browser; the
              others are server-only and must never gain that prefix.
            </li>
            <li>
              <span className="t-index mr-2">03</span>
              <span className="font-mono text-xs text-foreground">npm install &amp;&amp; npm run dev</span> in{" "}
              <span className="font-mono text-xs text-foreground">frontend/</span>. The app reads the deployed
              contract, so you get live data without deploying anything.
            </li>
            <li>
              <span className="t-index mr-2">04</span>
              To deploy your own copy of the contract, the script is in{" "}
              <span className="font-mono text-xs text-foreground">deploy/</span> and the test suite runs with{" "}
              <span className="font-mono text-xs text-foreground">pytest</span> against GenLayer&apos;s test harness.
            </li>
          </ol>
        </div>
      </section>

      <section aria-labelledby="next" className="border-t border-line pt-10">
        <h2 id="next" className="display-wide mb-3 text-2xl">
          Where to go next
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          <Link href="/how-it-works" className="t-link">
            How it works
          </Link>{" "}
          walks the same flow without the signatures.{" "}
          <Link href="/judges" className="t-link">
            The walkthrough
          </Link>{" "}
          runs it on chain in five minutes. If something here is wrong or unclear, the{" "}
          <a href={`${REPO}/issues`} target="_blank" rel="noreferrer" className="t-link">
            issue tracker
          </a>{" "}
          is the place to say so.
        </p>
      </section>
    </PageShell>
  );
}
