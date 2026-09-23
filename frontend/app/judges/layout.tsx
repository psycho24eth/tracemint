import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Verify TraceMint in five minutes",
  description:
    "Run the whole flow — scan, verdict, notice, payment, payout — as real transactions on GenLayer Studio Next, without a wallet of your own.",
  path: "/judges",
});

export default function JudgesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
