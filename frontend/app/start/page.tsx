import type { Metadata } from "next";

import { PageShell } from "@/components/PageShell";
import { SectionHeading } from "@/components/SectionHeading";
import { Storyboard } from "@/components/start/Storyboard";

export const metadata: Metadata = {
  title: "Start here",
  description:
    "Watch TraceMint catch one stolen picture from start to finish: what the robot found, what the judges said, and what the shop had to pay. No wallet needed.",
};

/**
 * The front door for somebody who has never used a wallet. Everything else on the site explains what
 * TraceMint is; this page shows one real case happening to one real picture, and only then asks for
 * anything. Server component so the page carries its own title and description; the reveal is a client
 * component underneath.
 */
export default function StartPage() {
  return (
    <PageShell>
      <SectionHeading as="h1" kicker="Two minutes, no wallet" title="What TraceMint actually does">
        Somebody took an artist&apos;s picture and sold it. Here is the whole story of what happened next — a real one,
        already recorded, with nothing hidden and nothing for you to fill in.
      </SectionHeading>

      <Storyboard />
    </PageShell>
  );
}
