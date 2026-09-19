/** Wallets TraceMint suggests to visitors who have none installed. */
export interface WalletGuide {
  rdns: string;
  name: string;
  install: string;
  /** A link that opens a page inside the wallet's mobile app browser, where the wallet can connect. */
  openInApp?: (pageUrl: string) => string;
}

export const WALLET_GUIDES: WalletGuide[] = [
  {
    rdns: "io.metamask",
    name: "MetaMask",
    install: "https://metamask.io/download/",
    openInApp: (pageUrl) => `https://metamask.app.link/dapp/${pageUrl.replace(/^https?:\/\//, "")}`,
  },
  {
    rdns: "io.rabby",
    name: "Rabby Wallet",
    install: "https://rabby.io/",
  },
  {
    rdns: "com.coinbase.wallet",
    name: "Coinbase Wallet",
    install: "https://www.coinbase.com/wallet/downloads",
    openInApp: (pageUrl) => `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(pageUrl)}`,
  },
  {
    rdns: "com.okex.wallet",
    name: "OKX Wallet",
    install: "https://web3.okx.com/download",
    openInApp: (pageUrl) =>
      `https://www.okx.com/download?deeplink=${encodeURIComponent(`okx://wallet/dapp/url?dappUrl=${encodeURIComponent(pageUrl)}`)}`,
  },
  {
    rdns: "com.trustwallet.app",
    name: "Trust Wallet",
    install: "https://trustwallet.com/download",
    openInApp: (pageUrl) => `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(pageUrl)}`,
  },
];

/** The wallet TraceMint was tested with end to end. */
export const RECOMMENDED_RDNS = "io.metamask";

export const WALLET_EXPLAINER_URL = "https://ethereum.org/en/wallets/";

/** Phones and tablets, where wallets live in apps rather than browser extensions. */
export function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const agent = navigator.userAgent;
  // iPadOS reports itself as a Mac, so touch support tells the two apart.
  return /Android|iPhone|iPad|iPod|Mobile/i.test(agent) || (/Macintosh/i.test(agent) && navigator.maxTouchPoints > 1);
}
