import type { Metadata } from "next";

/**
 * A notice page names a third party's domain next to an accusation. Publishing that is fine — the page
 * exists so the site owner can check the finding and settle it — but it should not be a search result
 * that outlives the dispute. Search engines get the index of notices; this page is for whoever holds
 * the link.
 */
export const metadata: Metadata = {
  title: "Notice",
  robots: { index: false, follow: false },
};

export default function NoticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
