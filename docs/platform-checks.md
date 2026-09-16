# Platform checks (Studio Next)

Network: Studio Next (chain 61997), runner `py-genlayer:5jycge4…`. Three runs on 2026-09-16:

- **Run 1** (Task 2): `npm run spike`
- **Run 2** (Task 2b): `npm run spike` again, extended, plus `spikes/transfer-check.ts`
- **Run 3** (Task 2b): `spikes/evm-transfer-check.ts`

## Run 1

| Check | Result | Evidence |
|---|---|---|
| Runner header `5jycge4…` deploys | PASS | Tx `0x70bbae0e…`, `5 / FINISHED_WITH_RETURN`, contract `0x73cDdB5C6Bd47C1e42943b350A8b010E4217C769`. https://explorer-studio-dev.genlayer.com/tx/0x70bbae0ef2770405aed7425622e00466cd90d853f22b3bda4df5af64cb69f4e2 |
| Two-image prompt with raw `web.get` bytes, same artwork | FAIL | The leader raised `NondetException: INVALID_IMAGE` inside `exec_prompt`. https://explorer-studio-dev.genlayer.com/tx/0xa0f5b97d03df88d720e6ddd5469e2e296656446e5e49b13e3045da310f20eb13 |
| Two-image prompt with raw `web.get` bytes, different artwork | FAIL | Same `INVALID_IMAGE`. https://explorer-studio-dev.genlayer.com/tx/0xd044b52491ae742c34a3931d32d0852955d36f3f45486ee56d5ab0caeb8bf958 |
| `web.render` text mode + `strict_eq` | PASS | Stored `{"found": true}`. https://explorer-studio-dev.genlayer.com/tx/0x29838c3d7f3b37af7016c7e3e0445d5deb599d22644f6b864ef74ff0a6685273 |
| `emit_transfer` to a wallet with no message budget | FAIL | `FINISHED_WITH_ERROR` with empty stderr. The explorer receipt shows "Message fee budget 0 wei", and the creator balance did not change. https://explorer-studio-dev.genlayer.com/tx/0x79754575b7bf5f79e62acc9cdcdb6775516b5e3d8c2fba6ccd8febcb89c69e6a |
| Explorer links | PASS | `${EXPLORER_URL}/tx/{hash}` and `${EXPLORER_URL}/address/{address}` return HTTP 200 and render full receipts. A bogus path returns 404. |

## Run 2

Spike contract `0x282A5b1175B914a6cA9cDA9fe4519cb681223980`.

| Check | Result | Evidence |
|---|---|---|
| Raw `web.get` bytes, same / different artwork | FAIL | `FINISHED_WITH_ERROR` again. https://explorer-studio-dev.genlayer.com/tx/0xb4ad5b8309d0b56a6290c7d50f6a21e27789e5c49ab6575254f2f9885c425c66, https://explorer-studio-dev.genlayer.com/tx/0xd8112998c7852756086071131f7da1f9159f4dbcb933c3ac2cebf057cc7b2a2a |
| Text-only JSON prompt | PASS | Stored `{"answer": "blue"}`. https://explorer-studio-dev.genlayer.com/tx/0xa8435a7c44923a86ca3e1b87cc3ca4d8768b9df917f413d77b29fbe8a2b5d7aa |
| Screenshots (`web.render(mode="screenshot")`), Starry Night 960px vs 500px | PASS | Stored `{"same_work": true}`. https://explorer-studio-dev.genlayer.com/tx/0xdd5011985cb116e36c28facd0a08be810575382fd3039597150fef7bc99b4542 |
| Screenshots, Starry Night vs Mona Lisa | PASS | Stored `{"same_work": false}`. https://explorer-studio-dev.genlayer.com/tx/0xfb97d2ee66bb9079953561c62579f309d9704768c77aa86b779668a40751d05f |
| Page-text usage classification | PASS | Stored `{"usage": "EDITORIAL"}` for the Wikipedia article. https://explorer-studio-dev.genlayer.com/tx/0x839592cf0d899cad5cc19deb792380cbd949cf1a40d985229884e167e7d22409 |
| Internal `emit_transfer`, no message budget | FAIL | `FINISHED_WITH_ERROR`, balance unchanged. https://explorer-studio-dev.genlayer.com/tx/0x9c36cae629a7f1768718e074ee077c4d16865a14136e57c1ed06933428a3b0ef |
| Internal `emit_transfer`, hand-written allocation with no `budget` | FAIL | Reverted before execution: EVM tx `0xa5977946…` `InvalidFeeParams`. genlayer-js sums the root allocation budgets into `totalMessageFees`, so the message had a budget of 0. |
| Internal `emit_transfer`, fees from `estimateTransactionFeesForWrite` | EXECUTES, NEVER DELIVERED | The simulation produced one Internal allocation with a 0.06 GEN budget. The tx is `FINALIZED / FINISHED_WITH_RETURN` and lists the 1 GEN message, but it triggered no transaction. More than 8 hours later the creator balance is unchanged and the 1 GEN is still in the spike contract. https://explorer-studio-dev.genlayer.com/tx/0x0512394618117aa2ddf19c73e54ab6861c82dcabd29d60df48365b19cb14d86c |
| Internal `emit_transfer`, `totalMessageFees` pool only (what the Transaction Kit sends) | FAIL | `FINISHED_WITH_ERROR`: `Mode1MessageFeesRequireGenVMPerEmissionSupport: fee-bearing GenVM messages require a message allocation tree`. https://explorer-studio-dev.genlayer.com/tx/0x5285fe20b455de1336c3c9b5f72baf59eaa417104e3a628f187d28254cbaaa13 |

## Run 3

Spike contract `0x9df23488FE9c2B2E60b29D2244929fD130e12596`.

| Check | Result | Evidence |
|---|---|---|
| External message `gl.evm.Account(to).emit_call(amount, b"")`, fees from `estimateTransactionFeesForWrite` | PASS | The simulation produced one External allocation (`messageType` 0) with a budget of 0.00015 GEN; total fee value was 0.000459 GEN. The tx is `FINALIZED / FINISHED_WITH_RETURN`. Creator balance went from 1000 to 1001 GEN within the polling window, and the spike balance went back to 0. https://explorer-studio-dev.genlayer.com/tx/0x425209ce97a5d365fab6eaa2cc179ef4f9c15325e5aa178eb70ef2140bd1eba2 |

## Decisions

- **Consensus function:** LicenseHunter calls `gl.vm.run_nondet`.
  - Both `run_nondet` and `run_nondet_default` use the same `RunNondet` host call, which works on Studio Next.
  - genvm-lint 0.11.1rc2 only recognizes `run_nondet` as a nondet entry point.
  - The contract's validators return a verdict even when the leader fails, which is how `run_nondet` expects them to behave. Under `run_nondet_default` that case raises the `TypeError` recorded below.
- **Judging mode:** `vision`. Images reach the model as browser screenshots from `web.render(mode="screenshot")`. Raw downloaded bytes fail with `INVALID_IMAGE`.
- **Heavy fee preset:** 600/600 time units. Studio Next rejects validator allocations above 600 with `PhaseTimeoutOutOfBounds(1200,30,600)`, and 600/600 leaves ample headroom.
- **Transfers:** pay wallets with an external message, `gl.evm.Account(gl.Address(to)).emit_call(amount, b"")`.
  - The caller must declare a message allocation tree, which is what `client.estimateTransactionFeesForWrite(...)` returns (`messageAllocations`). A write that emits a message is sent with `fees: { distribution, messageAllocations, feeValue }`.
  - Internal `emit_transfer` messages to wallets never arrive.
  - Fee value alone, with no allocations, fails with `Mode1MessageFeesRequireGenVMPerEmissionSupport`. That is all the Transaction Kit's `submit` sends, so wallet writes that emit messages need allocations added on top of the kit.

## Notes for later tasks

- gltest direct mode has no handler for contract-emitted messages, so successful withdrawals are verified on Studio Next only.
- gltest direct mode returns empty bytes for `web.render(mode="screenshot")`, and the SDK decodes screenshots with Pillow. `tests/direct/conftest.py` stubs `PIL.Image` so the decoder accepts the mock.
- Run 1 also showed that under `run_nondet_default`, a leader error plus a validator that returns a bool raises `TypeError: validator function returned 'Return(calldata=False)' while leader returned 'VMError(...)'`. LicenseHunter avoids this by using `run_nondet`.
- Simulating a write with `estimateTransactionFeesForWrite` executes the method. Use it only for writes that emit messages (the withdrawals), not for `file_claim` or `dispute`, whose simulation would run the whole vision judgment.
