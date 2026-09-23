import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Notices issued",
  description:
    "Unlicensed copies that GenLayer validators agreed on, each with the page it was found on, the validators' reasoning and the licence fee that settles it.",
  path: "/notices",
});

export default function NoticesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
