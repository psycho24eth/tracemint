# LicenseHunter Plan 4 of 4: Deploy, Seed, Verify, Submit

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** turn the built system into a submitted entry: a public repo, a deployed site, a seeded demo work, a rehearsed judge path with real transaction links, a README that answers the six review questions, a demo video, and the portal form filled with real values.

**Owners:** Tasks 1, 2, 4, 5 are controller tasks (they touch credentials, live deployments, and the user's accounts). Task 3 and Task 7 are subagent tasks. Tasks 6 and 8 need the user: only they can record the video and press submit.

**Spec:** `docs/superpowers/specs/2026-09-15-licensehunter-genlayer-design.md`, sections 9 (judge path), 12 (schedule), 13 (submission package).

**Depends on:**
- **Plan 1:** the contract deployed on Studio Next, `LICENSE_HUNTER_ADDRESS` in `.env.local`, and `docs/platform-checks.md`
- **Plan 2:** `@licensehunter/agent`, `npm run scan`, and `.github/workflows/agent-scan.yml`
- **Plan 3:** the web app, the demo pages, `npm run sync:web`, and `npm run demo-art`

## Global Constraints

- **Network:** Studio Next, RPC `https://studio-next.genlayer.com/api`, chain ID `61997`, explorer `https://explorer-studio-dev.genlayer.com/`.
- **Success rule:** a transaction succeeded only when its status is `ACCEPTED` or `FINALIZED` and its execution result is `FINISHED_WITH_RETURN`.
- **Secrets:** private keys live in `.env.local`, in Vercel's environment settings, and in GitHub Actions secrets. Never in a commit, a log, a README, or the portal form. Before any push, `git log -p` the range for key material.
- **The user owns every outward step.** Creating the public repo, the first push, the Vercel deployment, the video, and the portal submission each need the user's explicit go-ahead in chat, one at a time. Do not batch them into one approval.
- **Repo:** `https://github.com/psycho24eth/licensehunter`, public, default branch `main`.
- **Deadline:** submissions close 2026-09-17 21:01 IST; last submission update by 18:00 IST that day.

## File Structure

| Path | Responsibility | Task |
|---|---|---|
| `deploy/seed-demo.ts` | Register the demo work against the deployed site | 3 |
| `deploy/measure-fees.ts`, `frontend/fee-profile.json` | Measured fee profile for the kit's quotes | 4 |
| `docs/judge-run.md` | The rehearsed judge path with real transaction links | 4 |
| `README.md` | The six review answers, architecture, commands, limits | 5 |
| `docs/video-script.md` | Narration and shot list for the demo video | 6 |
| `docs/submission.md` | Every portal field, ready to paste | 7 |

---

### Task 1 (controller + user): Public repo and first push

- [ ] **Step 1: Confirm with the user**

Ask once, in chat: create the public repo `psycho24eth/licensehunter` and push this branch as `main`? Do not continue without a clear yes.

- [ ] **Step 2: Check the history for secrets**

```bash
git log --patch --all -- .env.local .env | head -5
git log --all -S"PRIVATE_KEY=" --oneline
```

Expected: both print nothing. If either prints anything, stop and report it: the branch cannot be pushed until that commit is rewritten.

- [ ] **Step 3: Create the repo and push**

```bash
gh auth status
gh repo create psycho24eth/licensehunter --public --description "Autonomous IP licensing on GenLayer: validators judge copied images, site owners settle with a one-click licence." --source . --remote origin
git push -u origin feat/genlayer-rebuild:main
```

Expected: the repo exists and `main` holds every commit. Record the URL.

- [ ] **Step 4: Configure Actions**

```bash
gh secret set AGENT_PRIVATE_KEY --repo psycho24eth/licensehunter --body "$(grep '^AGENT_PRIVATE_KEY=' .env.local | cut -d= -f2-)"
gh variable set LICENSE_HUNTER_ADDRESS --repo psycho24eth/licensehunter --body "$(grep '^LICENSE_HUNTER_ADDRESS=' .env.local | cut -d= -f2-)"
gh run list --repo psycho24eth/licensehunter --limit 5
```

Expected: the secret and variable are set (never echo their values), and CI runs on `main`. Fix any red run before continuing; a green CI badge is one of the six review answers.

---

### Task 2 (controller + user): Deploy the site

- [ ] **Step 1: Confirm with the user**, then deploy with whichever path they have: the Vercel CLI (`npx vercel@latest`), the Vercel dashboard importing the GitHub repo, or the Vercel MCP connector once they authorize it.

- [ ] **Step 2: Project settings**
- Root directory: `frontend`
- Include source files outside the root directory: on, because the agent workspace lives at the repo root
- Framework preset: Next.js
- Node version: 22

- [ ] **Step 3: Environment variables** (Production and Preview)

Public: `NEXT_PUBLIC_GENLAYER_RPC_URL`, `NEXT_PUBLIC_GENLAYER_CHAIN_ID`, `NEXT_PUBLIC_GENLAYER_CHAIN_NAME`, `NEXT_PUBLIC_GENLAYER_SYMBOL`, `NEXT_PUBLIC_CONTRACT_ADDRESS`, `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS`, `NEXT_PUBLIC_DEMO_SITE_OWNER_ADDRESS`, and `NEXT_PUBLIC_SITE_URL` (the production origin, no trailing slash).
Server-only: `LICENSE_HUNTER_ADDRESS`, `AGENT_PRIVATE_KEY`, `DEMO_CREATOR_PRIVATE_KEY`, `DEMO_SITE_OWNER_PRIVATE_KEY`.

- [ ] **Step 4: Deploy, then verify the pages validators will fetch**

```bash
curl -s -o /dev/null -w "%{http_code} " <site>/demo/portfolio <site>/demo/shop <site>/demo/blog <site>/demo/permission
curl -s <site>/demo/shop | grep -o '0x[0-9a-fA-F]\{40\}' | sort -u
curl -s <site>/demo/portfolio | grep -o '0x[0-9a-fA-F]\{40\}' | sort -u
curl -s <site>/demo/shop | grep -o 'synth-hoodie-banner.jpg'
```

Expected: four `200`s; the shop page shows exactly the demo site owner's address; the portfolio page shows exactly the demo creator's address; the product image URL is the plain file path. Fix the pages before seeding — the addresses on them are what the contract reads.

- [ ] **Step 5: Set `NEXT_PUBLIC_SITE_URL` to the production origin and redeploy**, then re-run Step 4.

---

### Task 3 (subagent): Seed the demo work

**Files:** create `deploy/seed-demo.ts`; add `"seed": "tsx deploy/seed-demo.ts"` to the root `package.json`.

**What it does:** registers the demo work as the demo creator against the deployed site, so the ownership check fetches a real page.

- [ ] **Step 1: Write `deploy/seed-demo.ts`**

It reads `SITE_URL` from `process.env.NEXT_PUBLIC_SITE_URL` (required, no trailing slash), `DEMO_CREATOR_PRIVATE_KEY`, and `LICENSE_HUNTER_ADDRESS` through `loadEnv`/`requireEnv`; skips with a message when the work is already registered (any work whose `portfolio_url` equals `<site>/demo/portfolio` in `list_works`); then calls `write` with `HEAVY_FEES` for:

```
register_work(
  "Cybernetic Horizon",
  "<site>/demo/cybernetic-horizon.png",
  "<site>/demo/portfolio",
  10 GEN in wei,
  "Non-exclusive web license, 12 months",
  ["<site>/demo/shop", "<site>/demo/blog"],
)
```

It prints the work id, `describeTx`, the transaction link, and the address link, and exits non-zero when the transaction did not succeed.

- [ ] **Step 2: Run it**

```bash
npm run seed
```

Expected: `ACCEPTED / FINISHED_WITH_RETURN` and work id `1`. A revert saying "Wallet address not found on portfolio page" means the portfolio page does not show `NEXT_PUBLIC_DEMO_CREATOR_ADDRESS` — fix the deployment, not the contract.

- [ ] **Step 3: Confirm through the site**: `/works` lists the work, and `/works/1` shows both watched URLs.

- [ ] **Step 4: Commit** `deploy/seed-demo.ts` and the root `package.json`.

---

### Task 4 (controller): Rehearse the judge path and measure fees

- [ ] **Step 1: Walk the spec section 9 path on the deployed site**, in the browser, as a judge would: demo creator role, "Scan now" on the demo work, wait for validators, open the shop notice, switch to the demo site owner, pay, switch back, withdraw, then scan again and dispute the new notice with `/demo/permission`.

- [ ] **Step 2: Record what happened in `docs/judge-run.md`**: each step, the transaction hash and link, the status and execution result, the wall-clock wait, and the resulting contract state (claim ids, verdicts, usage, prominence, fee, license id, balances). Note every deviation from the spec's expected outcome.

- [ ] **Step 3: Measure the fee profile**

Write `deploy/measure-fees.ts`, which calls `estimateTransactionFees` for `register_work`, `file_claim`, `pay_license`, and `dispute` with the presets the app uses, and writes `frontend/fee-profile.json` in the shape the template's fee-profile mechanism already expects (read the template's existing `frontend/fee-profile.json` first and keep its structure). Then redeploy so the kit quotes from measured numbers.

- [ ] **Step 4: If any step failed**, file it as a finding: fix it in the owning plan's code, commit, redeploy, and rerun the path. The judge path working end to end on the deployed site is the submission's core claim.

---

### Task 5 (controller): README for the reviewers

- [ ] Rewrite `README.md` with these sections, using real values from `docs/judge-run.md` and `docs/platform-checks.md`:

1. **What it is** — one paragraph, plus the corrected pitch lines from spec section 13.
2. **Live** — site URL, contract address with explorer link, network and chain id.
3. **Verify in five minutes** — the judge path, matching `/judges` on the site.
4. **The six review answers** — a real GenLayer contract (address, link, method list); why decentralized judgment; what state and validator checks exist (`run_nondet_default`, the fields validators compare, the error classes); that it builds and works (CI badge, commands, the judge run); what goes beyond the boilerplate (contract, agent, demo pages, notice and licence flows, demo mode); how to verify through the frontend.
5. **Architecture** — contract, agent, web app, and the consensus paths, with a short diagram in text.
6. **Run it yourself** — install, `pytest tests/direct`, `PYTHONUTF8=1 genvm-lint check`, `npm test`, `npm run build`, `npm run scan`, `npm run spike`.
7. **Limits and honesty** — watchlist scanning only unless a Cloud Vision key is set; notices are automated findings, not legal advice; Studio Next is a test network and GEN there has no value; the demo wallets are server-signed for judges.
8. **Licence and credits** — the boilerplate's licence, and that the demo artwork was generated for this project.

---

### Task 6 (user): Demo video

- [ ] Write `docs/video-script.md`: a 2-3 minute script with narration and the exact click sequence, timed in segments (problem 20s, register and scan 40s, validators and the notice 40s, pay and licence 30s, withdraw and dispute 20s, close 10s), plus the three claims to state out loud: validators judge, the fee is computed on chain, the creator keeps 97%.
- [ ] The user records the screen, narrates, and uploads to YouTube. Tell them the link must be public or unlisted, not private, and ask for the URL.

---

### Task 7 (subagent): Portal submission content

- [ ] Write `docs/submission.md` with every field filled from real values, ready to paste:
  - **Track:** Onchain Justice
  - **Project name and logo:** LicenseHunter; the favicon SVG doubles as the mark
  - **One-liner:** under 120 characters
  - **Description:** what it does, why GenLayer's validators are the right judge, and what is on chain
  - **YouTube link:** from Task 6
  - **How to verify:** the numbered judge path with the demo role buttons and the expected values (45 GEN fee, 43.65 GEN to the creator)
  - **Expected verification outcome:** what a reviewer should see at each step, plus the contract explorer link
  - **Website:** the deployed URL
  - **GitHub:** `https://github.com/psycho24eth/licensehunter`
- [ ] Keep every claim checkable against the deployed site; cut anything that is not.

---

### Task 8 (user + controller): Submit and keep improving

- [ ] The user submits the form early, then keeps improving: the portal allows updates, and an early submission protects against a last-minute failure.
- [ ] After submitting: watch the GitHub Actions scan schedule, watch for "Action needed" mail from the organizers, and rerun the judge path once more before 18:00 IST on 2026-09-17.
- [ ] Final check before the deadline: the site loads, `/judges` works, the contract answers reads, the video plays, and the repo is public.
