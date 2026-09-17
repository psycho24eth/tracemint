# TraceMint

**Turn IP infringement into instant licensing.** Creators register images they own. An agent watches the sites they choose and finds copies. GenLayer validators then judge each copy: is it the same artwork, is it licensed, and how is it used? A confirmed unlicensed copy gets an on-chain, time-stamped notice with a pay link. The site owner settles with a one-click license, and the creator withdraws 97% of the fee.

[![CI](https://github.com/psycho24eth/licensehunter/actions/workflows/ci.yml/badge.svg)](https://github.com/psycho24eth/licensehunter/actions/workflows/ci.yml)

| | |
|---|---|
| Live app | https://tracemint.vercel.app |
| Judge guide | https://tracemint.vercel.app/judges |
| Contract | [`0xA7225195035c80Fc6E9128112947B9bF87c7A5Dd`](https://explorer-studio-dev.genlayer.com/address/0xA7225195035c80Fc6E9128112947B9bF87c7A5Dd) |
| Network | GenLayer Studio Next, chain id 61997, RPC `https://studio-next.genlayer.com/api` |
| Frontend kit | `@genlayer/transaction-kit@0.1.0-rc.2` with `genlayer-js@2.0.0-rc.1` (boilerplate `v2-dev`) |

## Verify it in five minutes

Everything below runs on the live site. You do not need a wallet: the role switcher in the top bar signs as a funded demo creator or demo site owner.

1. Open **/judges** and switch the role to **Demo creator**.
2. Open the demo work **Cybernetic Horizon** and press **Scan now**.
   - The agent reads the two watched pages (a shop and a blog) and matches their images against the work with a perceptual hash.
   - It files a claim for each match.
   - Validators then judge each claim. They take browser screenshots of both images, read the page, and must agree on the verdict. This takes one to two minutes.
3. **Expected result:**
   - The **shop** claim becomes a **notice**: `COPY_UNLICENSED`, ads/merchandise, primary image, **45 GEN**, addressed to the wallet printed on the shop page.
   - The **blog** claim is stored as `COPY_LICENSED`, with no notice, because the blog credits the licence.
4. Open the notice, switch to **Demo site owner**, and pay **45 GEN**. The contract issues a 12-month license.
5. Switch back to **Demo creator** and open **Dashboard**. Withdrawable earnings show **43.65 GEN**, which is 97% of the fee. Press **Withdraw**, and the GEN arrives in the creator wallet.
6. Optional: scan again to get a fresh notice. Then, as the site owner, dispute it with the proof URL `/demo/permission`. Validators read the permission letter and withdraw the notice.

Every step links to its transaction on the [Studio Next explorer](https://explorer-studio-dev.genlayer.com).

## The six review questions

**1. Does the app call a real GenLayer contract?**
Yes. Every action in the app is a read or a write against the deployed contract, `LicenseHunter` in [contracts/license_hunter.py](contracts/license_hunter.py). LicenseHunter is the project's code name; it also names the agent package.
- Writes: `register_work`, `update_watchlist`, `file_claim`, `pay_license`, `withdraw_earnings`, `withdraw_protocol_fees`, `dispute`, `set_agent`.
- Views: `get_work`, `list_works`, `get_claim`, `list_claims`, `list_notices`, `get_license`, `list_licenses`, `get_earnings`, `get_stats`.

Wallet users sign through the Transaction Kit panel, and the demo roles sign server-side.

**2. Why does decentralized judgment matter here?**
Deciding whether an image on someone else's site is a copy of your work involves judgment calls:
- Is it cropped or recolored?
- Does the page show a licence?
- Is the use editorial or an ad?

If the accuser decides, the accused has no reason to trust the fee. In TraceMint, several independent validators each fetch the evidence themselves and must agree on the verdict, the usage class, and the prominence before a notice or fee exists. The notice, the reasoning, and the fee are then public and time-stamped. A dispute re-runs the same judgment with the site owner's proof.

**3. Does the contract keep meaningful state, and do validators check the meaningful outcome?**
- **State:**
  - works (creator, image, portfolio, base price, terms, watchlist)
  - claims (verdict, usage, prominence, fee, the wallet found on the page, status)
  - claim keys that block duplicates
  - licenses with expiry
  - per-creator withdrawable balances
  - the protocol balance
- **Claims and disputes** run in `gl.vm.run_nondet`. The leader fetches both images as browser screenshots and fetches the page text (plus the proof page for disputes), then asks the model for a JSON verdict. Each validator re-runs the whole judgment and compares only the decision fields: verdict, usage, and prominence. The prose reasoning is not compared.
- **Errors** are classified as `[EXPECTED]`, `[EXTERNAL]`, `[TRANSIENT]`, or `[LLM_ERROR]`. Validators agree on a leader error only when they hit the same class.
- **Ownership check:** registration uses `gl.eq_principle.strict_eq` to confirm that the creator's wallet address appears on their portfolio page.
- **Fee:** computed on chain from the base price and the validated usage and prominence.

**4. Does the repository build and work?**
- CI runs the contract linter, the contract tests, and the agent tests.
- Locally:
  - 75 direct-mode contract tests
  - 57 agent tests
  - the web test suite
  - `next build`
- The contract is deployed and smoke-checked on Studio Next.
- [docs/platform-checks.md](docs/platform-checks.md) records the platform behaviour this design depends on, with explorer links.

**5. What goes beyond the boilerplate?**
- The contract: works, claims, the vision judgment, fees, licenses, disputes, withdrawals, and error classes.
- The scanning agent ([agent/](agent/)):
  - HTML image discovery
  - SSRF-safe fetching with size caps and timeouts
  - a 64-bit difference hash for matching
  - a CLI
  - a scheduled GitHub Action that scans every 30 minutes
- Demo mode: rate-limited, server-signed demo roles.
- Pages for works, notices, licenses, and the creator dashboard.
- Four evidence pages that validators read: portfolio, shop, blog, and permission letter.
- An interactive 3D landing page.
- Platform spikes that found how Studio Next handles vision input and payouts.

**6. Can someone use the frontend and verify the result?**
Yes. Follow **/judges**, or the five steps above. Each step shows the transaction status and links to the explorer.

## How it works

```
creator ──register_work──▶ TraceMint contract    ◀── validators (ownership check: wallet on portfolio page)
                                   ▲
agent (GitHub Action / Scan now) ──file_claim(work, page, image)
   │  fetch watched pages → extract images → difference hash → match
   ▼
validators: screenshot both images + read page → verdict, usage, prominence → must agree
   │
   ├─ COPY_UNLICENSED → notice + fee (base × usage × prominence)
   └─ licensed / different / unclear → stored, no notice
site owner ──pay_license──▶ 12-month license; creator balance += 97%
creator ──withdraw_earnings──▶ external message pays the creator wallet
site owner ──dispute(proof)──▶ validators re-judge with the proof → notice withdrawn or kept
```

**Fee example:** a 10 GEN base price × 3.0 (ads/merchandise) × 1.5 (primary image) = **45 GEN**. The creator receives 43.65 GEN, and 1.35 GEN (3%) goes to the protocol.

## Run it yourself

Requirements: Node 22+, Python 3.12, and [uv](https://docs.astral.sh/uv/).

```bash
npm install
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe -r requirements.txt   # macOS/Linux: .venv/bin/python
PYTHONUTF8=1 .venv/Scripts/genvm-lint.exe check contracts/license_hunter.py
.venv/Scripts/python.exe -m pytest tests/direct -q
npm test --workspace agent
npm test --workspace frontend
npm run build
```

Studio Next scripts read keys from a git-ignored `.env.local`:
- `npm run accounts` creates and funds test accounts.
- `npm run deploy:contract` deploys the contract.
- `npm run smoke` checks the deployment.
- `npm run seed` registers the demo work.
- `npm run scan` runs the agent once.
- `npm run spike` runs the platform checks.
- `npm run sync:web` writes `frontend/.env.local`.

## Limits and honesty

- **Watchlist only:** the agent scans the pages a creator lists. There is no web-wide image search.
- **Not legal advice:** notices are automated findings.
- **Test network:** Studio Next is a test network, and its GEN has no value. The demo roles sign with test keys held by the server and are rate-limited.
- **Vision input:** Studio Next's model rejects raw downloaded image bytes, so validators compare browser screenshots of the image URLs.
- **Payouts need a message fee allocation:**
  - Studio Next only delivers a contract-emitted payout when the transaction declares a fee allocation for the message. The server builds that allocation with `estimateTransactionFeesForWrite`.
  - Transaction Kit `0.1.0-rc.2` does not send allocations, so wallet-mode withdrawals are disabled in the UI, and withdrawals run through the demo creator role.
  - Internal `emit_transfer` messages never reached wallets on Studio Next, so the contract pays with an external message instead.

  Evidence for both is in [docs/platform-checks.md](docs/platform-checks.md).

## Credits

Built on GenLayer's project boilerplate (`v2-dev`), MIT licensed; see [LICENSE](LICENSE). The demo artwork was generated for this project by `scripts/generate-demo-art.ts`.
