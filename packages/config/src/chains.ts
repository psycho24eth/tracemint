export interface ChainConfig {
  id: number;
  name: string;
  network: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: { http: string[] };
    public: { http: string[] };
  };
  blockExplorers: {
    default: { name: string; url: string };
  };
  testnet: boolean;
}

export const SUPPORTED_CHAINS: Record<number, ChainConfig> = {
  11155111: {
    id: 11155111,
    name: "Sepolia Testnet",
    network: "sepolia",
    nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://rpc.sepolia.org"] },
      public: { http: ["https://rpc.sepolia.org"] },
    },
    blockExplorers: {
      default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
    },
    testnet: true,
  },
  84532: {
    id: 84532,
    name: "Base Sepolia",
    network: "base-sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://sepolia.base.org"] },
      public: { http: ["https://sepolia.base.org"] },
    },
    blockExplorers: {
      default: { name: "BaseScan", url: "https://sepolia.basescan.org" },
    },
    testnet: true,
  },
  421614: {
    id: 421614,
    name: "Arbitrum Sepolia",
    network: "arbitrum-sepolia",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
      public: { http: ["https://sepolia-rollup.arbitrum.io/rpc"] },
    },
    blockExplorers: {
      default: { name: "Arbiscan", url: "https://sepolia.arbiscan.io" },
    },
    testnet: true,
  },
  31337: {
    id: 31337,
    name: "Local Anvil / Genlayer Studio EVM",
    network: "localhost",
    nativeCurrency: { name: "Local ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: {
      default: { http: ["http://127.0.0.1:8545"] },
      public: { http: ["http://127.0.0.1:8545"] },
    },
    blockExplorers: {
      default: { name: "Local Explorer", url: "http://localhost:8545" },
    },
    testnet: true,
  },
};

export const DEFAULT_CHAIN_ID = 11155111;
