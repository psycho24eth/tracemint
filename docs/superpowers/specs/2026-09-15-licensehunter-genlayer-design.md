# LicenseHunter on GenLayer — Design Spec

- **Date:** 2026-09-15
- **Status:** Draft for review
- **Target:** GenLayer Agent Tank hackathon, Onchain Justice track
- **Approved in chat:** architecture + contract (with ownership check), agent + web app, errors/testing/risks/schedule, switch to GenLayer's `v2-dev` template

## 1. Summary

LicenseHunter lets a creator register an image they own, has an agent look for copies of it on the web, and lets GenLayer validators decide whether a copy is unlicensed. When they agree it is, the contract records a time-stamped notice with a fee. The site owner can pay that fee in one transaction to get a 12-month license for the page. 97% is credited to the creator's balance at once, and the creator withdraws it whenever they like. A site owner who already has permission can dispute with a proof link, and validators re-judge.

Finding candidates is cheap and noisy, so it runs off-chain. Judging needs trust, so it runs in GenLayer consensus. Validators never trust the agent: they fetch every image and page themselves.

## 2. Goals and non-goals

### Goals (required for submission)

1. Creators register works; validators confirm the creator's portfolio page shows the creator's wallet address.
2. The agent finds candidate copies (watchlist mode always; web search mode when a Google Cloud Vision key is set) and files claims.
3. Validators independently re-run a vision judgment and must agree on the verdict, usage, and prominence. A notice exists only when they agree the use is an unlicensed copy.
4. Fee = base price × usage multiplier × prominence multiplier. One payment issues a license and credits 97% of the fee to the creator, who withdraws it in one transaction.
5. One dispute per notice, re-judged by validators with the proof page; the notice is withdrawn if the proof holds.
6. A web app on Studio Next, built from GenLayer's `v2-dev` template, with a demo mode so judges can finish the whole path without their own test GEN.
7. Submission package: README answering the six review questions, mandatory demo video, portal form copy, deployed site, deployed contract.

### Non-goals

- Contacting real site owners (email, HTTP pushes to their servers).
- Streaming royalties, secondary splits, or NFT/marketplace integrations.
- Legal enforcement or legal advice. Every notice carries "Not legal advice".
- Perceptual hashing inside the contract.
- An off-chain database. The contract is the only source of truth.
- Deploying to Bradbury or Asimov before the portal accepts the entry.

## 3. Constraints

From the organizers' email and GenLayer's current tooling:

| Constraint | Value |
|---|---|
| Network | Studio Next — RPC `https://studio-next.genlayer.com/api`, chain ID `61997`, explorer `https://explorer-studio-dev.genlayer.com/` |
| Fees | Every deploy and write carries a fee distribution and quoted fee value |
| Success rule | A transaction succeeded only if its status is `ACCEPTED` or `FINALIZED` **and** its execution result is `FINISHED_WITH_RETURN` |
| Frontend base | `genlayerlabs/genlayer-project-boilerplate`, branch `v2-dev`: Next.js 16, React 19, Tailwind 4, `@genlayer/transaction-kit` + `@genlayer/transaction-kit-react` `0.1.0-rc.2`, `genlayer-js` `2.0.0-rc.1` |
| Contract toolchain | Exactly as `v2-dev/requirements.txt` pins: `genlayer-py@v0.19-dev`, `genlayer-test@v0.30-dev`, `genvm-linter@v0.11-dev`, on Python 3.12 (installed with uv) |
| Video | Mandatory, even though the portal form marks it optional |
| Submission | Submit early through the portal; respond to any "Action needed" review note |
| Deadline | Submissions close **2026-09-17 21:01 IST (15:31 UTC)**, from the portal countdown the user shared on 2026-09-15 at 10:25 IST |

## 4. Architecture

```text
Creator ── register_work ─────────────────────────────▶ LicenseHunter contract (Studio Next)
Agent (GitHub Actions every 30 min, or "Scan now") ── file_claim ──▶ validators judge
Validators agree on verdict + usage + prominence ──▶ notice stored with fee
Site owner ── pay_license (GEN) ──▶ license issued, 97% credited to creator
Creator ── withdraw_earnings ──▶ GEN transferred to creator
Site owner ── dispute (proof URL) ──▶ validators re-judge, notice upheld or withdrawn
```

### Responsibility boundary

| Owner | Responsibilities |
|---|---|
| Frontend + agent | UI, candidate discovery (crawling, image fingerprints, web search), demo-mode signing, caching reads |
| Contract | Works and ownership verification, claims and verdicts, fee calculation, payments, payouts, licenses, disputes |
| External sources | Portfolio pages, suspect pages and images, reference images. Validators re-fetch all of them; nothing the agent reports is trusted beyond where to look. |

### Consensus paths

| Action | Evidence | Non-deterministic call | Validator rule | State change |
|---|---|---|---|---|
| `register_work` | Portfolio page text | Render page, check it contains the sender's address | `strict_eq` on `{"found": bool}` | Work stored, or `[EXPECTED]` error |
| `file_claim` | Reference image, found image, found page text | Vision LLM returns JSON verdict | Re-run and compare `verdict` and `wallet_on_page` exactly; if both say `COPY_UNLICENSED`, also compare `usage` and `prominence` exactly | Claim stored; notice issued only for `COPY_UNLICENSED` |
| `pay_license` | None | None | Deterministic | License stored, creator balance credited |
| `withdraw_earnings` | None | None | Deterministic | Creator balance zeroed, GEN transferred to creator |
| `dispute` | Both images, found page text, proof page text | Vision LLM returns JSON verdict with the proof considered | Same as `file_claim` | Notice withdrawn or upheld |

If validators cannot agree, the transaction ends without a decision and nothing is stored. Agreed verdicts other than `COPY_UNLICENSED` are still stored as claims, just without a notice.

## 5. Repository layout after migration

```text
contracts/license_hunter.py
tests/direct/            conftest.py, test_register.py, test_claims.py, test_fees.py,
                         test_payments.py, test_disputes.py, test_decisions.py
tests/integration/       test_studio_next_flow.py, test_fee_profile.py
deploy/deployScript.ts   template entry for `genlayer deploy`, pointed at LicenseHunter
deploy/studio-next.ts    Studio Next chain config, client, and deploy/write/read helpers
deploy/fund-accounts.ts  create and fund the agent, demo creator, and demo site owner accounts
deploy/deploy-license-hunter.ts, deploy/smoke.ts
deploy/seedDemo.ts       register the demo work from the demo creator account
spikes/                  throwaway Studio Next platform checks (not linted in CI)
docs/platform-checks.md  spike results and explorer link formats
agent/                   TypeScript scanner package (see section 7)
frontend/                Next.js 16 app from v2-dev, re-skinned as LicenseHunter
.github/workflows/ci.yml          lint + direct tests + agent tests + frontend test/typecheck/build
.github/workflows/agent-scan.yml  scheduled scan every 30 minutes + manual trigger
requirements.txt, pyproject.toml, gltest.config.yaml, package.json (workspaces: frontend, agent)
README.md
docs/superpowers/specs/  this file
```

- Template files are copied from `v2-dev` at a specific commit; that commit SHA is recorded in the README. Its git history is not merged.
- Removed from the tree: `apps/web`, `packages/*`, the Solidity/Foundry `contracts/` (including `lib/` vendored libraries), `supabase/`, the old root `.env.example` and CI workflow. Git history keeps them.
- `apps/web/tsconfig.tsbuildinfo` (an untracked TypeScript cache) is deleted, and `*.tsbuildinfo` is added to `.gitignore`.
- The football example contract, its tests, and its frontend components are removed once LicenseHunter equivalents exist.

## 6. Contract: `contracts/license_hunter.py`

### 6.1 Header and SDK conventions

- First line is the runner header `# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }`, a v0.3 runner in the published GenVM `v0.6.0-rc5` bundle. The `v2-dev` template's `9b8kjyda2ycxyq4ea6g4yfpnydxhd52gqba5rb8dw7krkh5mn9p0` is not in any published bundle, so neither gltest direct mode nor the linter's validation can load it (verified 2026-09-15). The Studio Next spike (section 11) confirms `5jycge4…` deploys; no `test`/`latest` aliases.
- SDK v0.3 names: `import genlayer as gl`, `gl.contract.Contract`, `gl.storage.TreeMap`, `gl.storage.allow` on dataclasses, `gl.message.sender_address`, `gl.message.value`, `gl.vm.UserError`, `gl.vm.run_nondet_default` (validator runs sandboxed), `gl.eq_principle.strict_eq`, `gl.chain.Account(address).emit_transfer(value, on="finalized")`, `gl.nondet.web.get`, `gl.nondet.web.render(url, mode="text")`, `gl.nondet.exec_prompt(prompt, images=[...], response_format="json")`.
- Integer types are annotated as `u256` and assigned plain `int` values. No floats cross the leader/validator boundary; multipliers are basis points.
- Time comes from `datetime.now(timezone.utc)`, which GenVM pins to the transaction timestamp.

### 6.2 Constants

| Name | Value |
|---|---|
| `PROTOCOL_FEE_BPS` | 300 (3%) |
| `LICENSE_SECONDS` | 31,536,000 (365 days) |
| `MAX_WATCH_URLS` | 10 |
| `MAX_PAGE_CHARS` | 4,000 |
| `MAX_IMAGE_BYTES` | 5,000,000 |
| Usage multipliers (bps) | `PERSONAL` 5,000 · `EDITORIAL` 10,000 · `COMMERCIAL` 20,000 · `ADS_MERCH` 30,000 |
| Prominence multipliers (bps) | `INCIDENTAL` 5,000 · `FEATURED` 10,000 · `PRIMARY` 15,000 |

`fee = base_price * usage_bps * prominence_bps // 100_000_000`. Example: 10 GEN, `ADS_MERCH`, `PRIMARY` → 45 GEN.

### 6.3 Storage

```text
owner: Address
agent: Address
next_work_id, next_claim_id, next_license_id: u256
protocol_balance: u256
works: TreeMap[u256, Work]
claims: TreeMap[u256, Claim]
licenses: TreeMap[u256, License]
claim_keys: TreeMap[str, u256]      # "<work_id>|<page_url>|<image_url>" → claim id, prevents duplicates
creator_balances: TreeMap[Address, u256]   # withdrawable earnings per creator
```

| Dataclass | Fields |
|---|---|
| `Work` | `id`, `creator: Address`, `title`, `image_url`, `portfolio_url`, `base_price: u256`, `terms`, `watch_urls` (JSON array string), `created_at: u256` |
| `Claim` | `id`, `work_id`, `page_url`, `image_url`, `filed_by: Address`, `verdict`, `usage`, `prominence`, `reasoning`, `wallet_on_page`, `fee: u256`, `status`, `dispute_proof_url`, `created_at: u256` |
| `License` | `id`, `claim_id`, `work_id`, `licensee: Address`, `page_url`, `amount: u256`, `creator_amount: u256`, `issued_at: u256`, `expires_at: u256` |

Verdicts: `COPY_UNLICENSED` (the found image is the registered work or a close edit, and the page shows no license or permission from the creator), `COPY_LICENSED` (same work, with visible license or permission), `DIFFERENT_WORK`, `UNCLEAR`.

`usage` and `prominence` hold one of the multiplier names from section 6.2 when the verdict is `COPY_UNLICENSED`, and `NONE` otherwise.

Claim statuses: `NOTICE_ISSUED`, `NO_NOTICE`, `PAID`, `WITHDRAWN`, `DISPUTE_REJECTED`.

### 6.4 Methods

| Method | Caller | Rules |
|---|---|---|
| `__init__(agent: str)` | deployer | `owner` = deployer, `agent` = given address |
| `set_agent(agent: str)` | owner | Replaces the agent address |
| `register_work(title, image_url, portfolio_url, base_price: int, terms, watch_urls: list[str]) -> int` | anyone | HTTPS URLs only; title 1–120 chars; `base_price > 0`; terms ≤ 500 chars; ≤ 10 watch URLs. Ownership check must find the sender's address (case-insensitive) in the rendered portfolio page, else `[EXPECTED] Wallet address not found on portfolio page`. |
| `update_watchlist(work_id, watch_urls: list[str])` | work creator | Same URL rules |
| `file_claim(work_id, page_url, image_url) -> int` | work creator or agent | HTTPS URLs; duplicate key rejected with `[EXPECTED] Claim already filed`. Runs the judgment; stores the claim. `COPY_UNLICENSED` → `NOTICE_ISSUED` with fee; any other verdict → `NO_NOTICE`, fee 0. |
| `pay_license(claim_id) -> int` (payable) | anyone | Claim must be `NOTICE_ISSUED` or `DISPUTE_REJECTED`; `gl.message.value` must equal the fee exactly. Stores the license, sets status `PAID`, adds `creator_amount = fee * 9700 // 10000` to `creator_balances[creator]` and the remainder to `protocol_balance`. No transfer happens here. Licensee is the payer. |
| `withdraw_earnings() -> int` | creator | Balance must be above zero. Zeroes the balance first, then calls `gl.chain.Account(sender).emit_transfer(amount, on="finalized")` and returns the amount. |
| `dispute(claim_id, proof_url) -> str` | `wallet_on_page` if set, otherwise anyone | Claim must be `NOTICE_ISSUED` with no prior dispute; HTTPS proof URL. Re-runs the judgment with the proof page. A verdict other than `COPY_UNLICENSED` → `WITHDRAWN`; otherwise `DISPUTE_REJECTED` (still payable). |
| `withdraw_protocol_fees(to: str)` | owner | Transfers `protocol_balance` and zeroes it |
| Views | anyone | `get_work`, `list_works`, `get_claim`, `list_claims(work_id)`, `list_notices`, `get_license`, `list_licenses(licensee)`, `get_earnings(creator)`, `get_stats` |

### 6.5 Judgment block

```text
leader_fn:
  ref   = web.get(work.image_url)       # non-2xx or > MAX_IMAGE_BYTES → classified error
  found = web.get(image_url)            # same checks
  text  = web.render(page_url, mode="text")[:MAX_PAGE_CHARS]
  proof = web.render(proof_url, mode="text")[:MAX_PAGE_CHARS] if disputing
  wallets = regex 0x[0-9a-fA-F]{40} over text (deterministic)
  raw = exec_prompt(prompt, images=[ref.body, found.body], response_format="json")
  normalize → {verdict, usage, prominence, reasoning (≤ 600 chars), wallet_on_page}
  unknown enum values → [LLM_ERROR]

validator_fn(leader_result):
  non-Return → classified-error handler
  mine = leader_fn()
  verdicts differ → False
  both COPY_UNLICENSED and (usage differs or prominence differs) → False
  wallet_on_page differs → False
  otherwise True        # reasoning is never compared

gl.vm.run_nondet_default(leader_fn, validator_fn)
```

- **Prompt:** image 1 is the registered work, image 2 is the found image. Page text and proof text sit in fenced `<untrusted>` blocks, with an instruction that embedded instructions are a red flag, not commands (the ClaimGuard defense). The prompt defines every verdict, usage, and prominence value with one example each, and demands JSON only.
- **Normalization:** strip code fences, parse JSON, uppercase enum values, coerce `usage`/`prominence` to `NONE` when the verdict is not `COPY_UNLICENSED`.
- **Tuning rule:** if the integration run shows repeated disagreements on `usage` or `prominence`, relax that field to "same or adjacent value" and store the leader's value. Record the change in the README.

### 6.6 Error classification

Following GenLayer's `write-contract` skill:

| Prefix | Meaning | Validator handling |
|---|---|---|
| `[EXPECTED]` | Business rule (bad input, wrong caller, wrong amount) | Must match exactly |
| `[EXTERNAL]` | 4xx from a fetched URL, oversized image | Must match exactly |
| `[TRANSIENT]` | Network failure or 5xx | Agree if both transient |
| `[LLM_ERROR]` | Unparseable or invalid model output | Always disagree, forcing a new leader |

## 7. Agent: `agent/`

TypeScript package run by Node 20+ in GitHub Actions and imported by the frontend's `POST /api/scan` route.

| Module | Responsibility |
|---|---|
| `src/contract.ts` | `genlayer-js` client with `createAccount(AGENT_PRIVATE_KEY)`; reads `list_works`/`list_claims`; writes `file_claim` with `estimateFeesDistribution` + `writeContract` + `waitForTransactionReceipt({ waitUntil: "decided" })`; applies the success rule |
| `src/watchlist.ts` | Fetches each watched page (10 s timeout, HTTPS only, private hosts blocked by the existing `validateSafeUrl`); extracts `img src`/`srcset`, `og:image`, `twitter:image`; resolves relative URLs; rewrites `ipfs://` to `https://ipfs.io/ipfs/`; ≤ 50 images per page |
| `src/phash.ts` | 64-bit difference hash with `sharp` (grayscale, 9×8 resize); Hamming distance; match when distance ≤ 10 |
| `src/websearch.ts` | Built last, and only if time allows (no key was provided). Only when `GOOGLE_VISION_API_KEY` is set: Cloud Vision `WEB_DETECTION` on the work image; collects `pagesWithMatchingImages` and their matching image URLs; ≤ 10 candidates per work; every candidate still passes `phash.ts` |
| `src/scan.ts` | For each work: gather candidates, drop known claim keys, file up to 5 claims per run, sequentially. Returns `{ filed, skipped, errors }` |
| `src/cli.ts` | `npm run scan --workspace agent` entry point |

- **Schedule:** `.github/workflows/agent-scan.yml` runs every 30 minutes and on manual dispatch. Secrets: `AGENT_PRIVATE_KEY`, `CONTRACT_ADDRESS`, optional `GOOGLE_VISION_API_KEY`.
- **Scan now:** `POST /api/scan { workId, runId? }` with `maxDuration = 300`. For the demo work, `runId` appends `?run=<runId>` to each watched URL so every judge files fresh, non-duplicate claims. The route submits its claims without waiting for validator decisions and returns the transaction hashes; the UI tracks each one. One run per 60 seconds per server instance.
- **Rate limits:** the scheduled scan submits writes one at a time and waits for each decision before the next.

## 8. Frontend: `frontend/` (from `v2-dev`)

### 8.1 Kept from the template

`app/providers.tsx`, `lib/genlayer/WalletProvider.tsx`, `client.ts`, `network.ts`, `kit.ts`, `components/ui/*`, sonner toasts, Vitest setup and existing tests, fee-profile mechanism.

### 8.2 Theme

Override the template's CSS variables in `app/globals.css` with the LicenseHunter palette: background `#05070d`, surface `#0c111d`, border `#1e293b`, accent `#00f2fe`, secondary `#7928ca`. Keep the Switzer font files.

### 8.3 Data access

- `lib/contracts/LicenseHunter.ts`: read methods; converts `Map` results from `readContract` into typed objects; wei values stay `bigint`.
- `lib/hooks/useLicenseHunter.ts`: TanStack Query hooks with query keys `works`, `claims`, `notices`, `licenses`, `stats`.

### 8.4 Writes

- **Wallet users:** `GenLayerTransactionPanel` from `@genlayer/transaction-kit-react` (`kit`, `tx`, `network="GenLayer Studio Next"`, `theme="dark"`, `trackUntil="decided"`, `onDone`), which shows the fee quote, hold-to-sign, and the timeline. `onDone` invalidates the affected queries.
- **Demo mode:** a navbar toggle with two roles, demo creator and demo site owner. Writes go to `POST /api/demo/write { role, method, args, value }`. The server signs with `DEMO_CREATOR_KEY` or `DEMO_SITE_OWNER_KEY` (never sent to the browser), using the same fee flow as the agent. Allowed methods: creator → `register_work`, `update_watchlist`, `file_claim`; site owner → `pay_license`, `dispute`. The UI polls `GET /api/tx/[hash]` for status and shows the same success rule.
- **Error text:** `describeError` from the kit for wallet flows; classified prefixes are shown as plain sentences. A transaction that ends undecided shows: "Validators couldn't agree, so nothing was recorded. Try again, or the agent will retry on its next run."

### 8.5 Routes

| Route | Content |
|---|---|
| `/` | Pitch in corrected wording (section 13), how it works, "Try the demo" |
| `/works` | List + register form (title, image URL, portfolio URL, base price in GEN, terms, watched URLs). Shows the connected wallet address to add to the portfolio page. |
| `/works/[id]` | Reference image, watchlist editor, claims table, "Scan now" |
| `/notices` | All notices with status pills |
| `/notices/[id]` | The previewed notice page: both images, verdict banner, reasoning, fee breakdown, terms, addressed-to wallet when present, Pay, Dispute (proof URL), explorer links |
| `/licenses/[id]` | License certificate: work, page, licensee, amounts, dates, transaction link |
| `/dashboard` | Withdrawable earnings with a Withdraw button, lifetime earnings (sum of `creator_amount`), counts by status |
| `/judges` | Step-by-step verification path, contract address, explorer links |
| `/demo/portfolio` | Demo creator page showing `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS` and the original artwork |
| `/demo/shop?run=` | Merch page using a cropped, resized copy of the artwork, no credit, showing the demo site owner's wallet ("Pay us in GEN") |
| `/demo/blog?run=` | Article using the artwork with a visible "Licensed from Demo Creator via LicenseHunter" credit |
| `/demo/permission?run=` | Permission letter from Demo Creator to Demo Shop for this artwork (dispute proof) |

Demo images live in `frontend/public/demo/`: one original artwork and one edited copy, both created for this project.

### 8.6 Configuration

Public: `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_GENLAYER_CHAIN_ID`, `NEXT_PUBLIC_GENLAYER_CHAIN_NAME`, `NEXT_PUBLIC_GENLAYER_SYMBOL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS`, `NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS`.
Server-only: `DEMO_CREATOR_KEY`, `DEMO_SITE_OWNER_KEY`, `AGENT_PRIVATE_KEY`, `GOOGLE_VISION_API_KEY` (optional).

Explorer link formats are confirmed against `explorer-studio-dev.genlayer.com` during the spike and kept in one helper.

## 9. Judge path (also the portal "How-to")

1. Open the site, click "Try the demo" (demo creator role).
2. Open the pre-registered work "Cybernetic Horizon" (its ownership check passed against `/demo/portfolio`).
3. Click "Scan now": the agent finds the artwork on `/demo/shop?run=<id>` and `/demo/blog?run=<id>` and files one claim for each. Wait 1–2 minutes for validators.
4. The shop claim becomes a notice: `COPY_UNLICENSED`, `ADS_MERCH`, `PRIMARY`, fee 45 GEN, addressed to the demo site owner.
5. The blog claim is stored as `COPY_LICENSED` with no notice, because the page credits a license.
6. Switch to the demo site owner, open the shop notice, click Pay. The license appears, and the creator's withdrawable earnings rise by 43.65 GEN. Switch back to the demo creator and click Withdraw.
7. Optional: click "Scan now" again, then dispute the new shop notice with `/demo/permission?run=<id>`: the notice is withdrawn.

## 10. Testing

| Layer | Tests |
|---|---|
| Contract, direct mode (`pytest tests/direct`) | Ownership pass, fail, and fetch error; each verdict path; all 12 usage × prominence fee combinations; creator/agent-only filing; duplicate claim; exact payment, wrong amount, double payment, paying a withdrawn notice; creator balance and protocol balance; withdrawal guards (the transfer itself runs only on Studio Next, because direct mode cannot execute transfers); license expiry; dispute withdrawn vs rejected; dispute caller restriction; one dispute per notice; protocol fee withdrawal |
| Validator logic | Comparison and normalization helpers tested as pure functions, because direct mode runs only the leader |
| Lint | `genvm-lint check contracts/license_hunter.py` in CI |
| Integration (`gltest`, Studio Next) | Full judge path; fee profile measured for `register_work`, `file_claim`, `pay_license`, `dispute` and written to `frontend/fee-profile.json` |
| Agent (Vitest) | Hash distance on fixtures (identical, resized, 10% crop, unrelated); image extraction (src, srcset, og:image, relative, ipfs); Vision response parsing from a fixture; duplicate skipping and the 5-claim cap with a mocked contract client |
| Frontend (Vitest + build) | Template tests still pass; contract wrapper `Map` conversion; demo-write route method allowlist; `tsc --noEmit`; `next build` |
| Manual | Section 9 path on the deployed site before each submission |

## 11. Risks and fallbacks

| # | Risk | Check | Fallback |
|---|---|---|---|
| 1 | Studio Next validators lack vision models or reject two images | Spike contract in the first two hours: one method that fetches two images and asks for a JSON comparison | Validators compare SHA-256 of both fetched images (exact copies only) and the LLM classifies usage from page text; the README states the limitation |
| 2 | Runner header or API names differ between sources | Spike deploy + `genvm-lint` from the pinned toolchain | Use whatever header and names the spike proves |
| 3 | Fees: the payer covers value plus fees, and each withdrawal transfer needs a message fee | Spike method with `emit_transfer`; measured fee profile | Withdrawals are already separate transactions paid by the creator. If the message fee still blocks them, fund it from the contract balance with `use_balance`. |
| 4 | Demo accounts need GEN on Studio Next | Fund the agent, demo creator, and demo site owner through the Studio Next faucet during the spike | Ask in GenLayer community channels for Studio Next funding |
| 5 | Prerelease kit or Next.js 16 issues | Template CI green before porting screens | Pin exact template versions; report issues upstream |
| 6 | Consensus flakiness on usage or prominence | Integration run | Tuning rule in section 6.5 |
| 7 | Rate limits (`-32429`, pending-queue cap) | Integration run | Sequential writes with waits; lower scan frequency |
| 8 | Deadline earlier than expected | User confirms on portal | Early submission at the end of day 2 |

## 12. Schedule

| Day | Work |
|---|---|
| Sep 15 | Import `v2-dev` template and remove old code; set up Python 3.12 with uv and the `genlayer` CLI; spike on Studio Next (vision, transfer, fees, explorer links); contract with direct tests and lint; deploy to Studio Next |
| Sep 16 | Agent with tests and scheduled workflow; frontend port (theme, data layer, routes, demo mode, demo pages); deploy the site; integration run and fee profile; **first portal submission** with a short video |
| Sep 17 (closes 21:01 IST) | Address reviewer notes and bugs; README polish; final video; update form copy; share for community ratings. Last submission update by 18:00 IST. |

## 13. Submission package

### README answers to the six review questions

1. **Real GenLayer contract:** address, explorer link, method list.
2. **Why decentralized judgment:** whether a page uses someone's work without permission is a judgment call. One platform or oracle making that call can be captured or biased; here several validators re-check the images themselves and must agree before anyone is charged.
3. **Meaningful state and validator checks:** works, claims, licenses, payouts, and disputes live in the contract; validators re-run the vision judgment and compare verdict, usage, and prominence.
4. **Builds and works:** CI status, local commands, deployed site.
5. **Beyond the boilerplate:** the LicenseHunter contract, agent, demo pages, notice and license flows, demo mode.
6. **Verify through the frontend:** the judge path in section 9.

### Pitch wording corrections

| Original pitch | Submitted wording |
|---|---|
| Computer-vision agents search the web 24/7 | The agent scans the sites you watch every 30 minutes, plus the open web when image search is on |
| Pushes a cease-and-desist to the offender's wallet or server | Issues an on-chain, time-stamped notice with a pay link, addressed to the wallet on the page when there is one |
| Zero cost for creators | No upfront cost; creators keep 97% of every license |
| Royalties stream to the creator | Credited to the creator on settlement and withdrawable anytime |

### Portal form

Track: Onchain Justice. One-liner, description, how-to (section 9), expected verification outcome, contract link, website, and GitHub repo are written after deployment so every link and value is real.

## 14. Decisions (resolved 2026-09-15)

1. **Public repo:** under `github.com/psycho24eth`, the account linked to the hackathon profile. The GitHub CLI is already logged in as this account.
2. **Deadline:** 2026-09-17 21:01 IST.
3. **No Google Cloud Vision key:** web search mode is built last, only if time allows. Watchlist mode covers the demo.
4. **GenLayer skills plugin:** not installed. This spec already follows its `write-contract`, `direct-tests`, `genvm-lint`, and `genlayer-cli` guidance.
