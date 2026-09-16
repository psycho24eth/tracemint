import { balanceOf, createAccount, generatePrivateKey, loadEnv, rpc, upsertEnv, type Hex } from "./studio-next";

const ROLES = ["AGENT", "DEMO_CREATOR", "DEMO_SITE_OWNER"] as const;
const MIN_BALANCE = 100n * 10n ** 18n;
const FUND_AMOUNT = "1000000000000000000000"; // 1,000 GEN in wei, sent as an exact JSON integer

loadEnv();
for (const role of ROLES) {
  let key = process.env[`${role}_PRIVATE_KEY`] as Hex | undefined;
  if (!key) {
    key = generatePrivateKey();
    upsertEnv(`${role}_PRIVATE_KEY`, key);
  }
  const address = createAccount(key).address;
  upsertEnv(`${role}_ADDRESS`, address);
  const before = await balanceOf(address);
  if (before < MIN_BALANCE) await rpc("sim_fundAccount", `["${address}", ${FUND_AMOUNT}]`);
  console.log(`${role} ${address} balance ${before} -> ${await balanceOf(address)} wei`);
}
