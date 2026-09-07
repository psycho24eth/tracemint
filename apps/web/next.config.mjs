/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@licensehunter/types", "@licensehunter/shared", "@licensehunter/config"],
};

export default nextConfig;
