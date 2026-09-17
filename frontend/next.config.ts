import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // The agent workspace ships TypeScript source, so Next compiles it for the API routes.
  transpilePackages: ["@licensehunter/agent"],
};

export default nextConfig;
