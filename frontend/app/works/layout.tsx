import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Registered works",
  description:
    "Every artwork registered on TraceMint, with the licence terms and base price its creator set and the pages the agent watches for copies.",
  path: "/works",
});

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
