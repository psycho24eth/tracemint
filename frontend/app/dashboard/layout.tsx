import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Your dashboard",
  description: "Your registered works, the claims filed against them, the licences paid, and the earnings you can withdraw.",
  path: "/dashboard",
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
