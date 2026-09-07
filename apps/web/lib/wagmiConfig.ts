import { http, createConfig, injected } from "wagmi";
import { sepolia, baseSepolia, arbitrumSepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [sepolia, baseSepolia, arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [sepolia.id]: http("https://rpc.sepolia.org"),
    [baseSepolia.id]: http("https://sepolia.base.org"),
    [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
  },
  ssr: true,
});
