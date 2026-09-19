const GEN = 10n ** 18n;

/** Test GEN the faucet sends per request, enough to pay a license and its fees. */
export const FAUCET_AMOUNT_GEN = 100n;
export const FAUCET_AMOUNT_WEI = FAUCET_AMOUNT_GEN * GEN;

/** Wallets holding this much or more are not topped up. */
export const FAUCET_CEILING_WEI = 100n * GEN;

/** Only Studio networks answer sim_fundAccount; testnets fund wallets their own way. */
export const faucetAvailable = (chain: { isStudio?: boolean }) => chain.isStudio === true;
