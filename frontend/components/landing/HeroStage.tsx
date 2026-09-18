"use client";

import type { CSSProperties, ReactNode } from "react";

import { CardSkeleton } from "@/components/cards/Collectible";
import { LicenseCard } from "@/components/cards/LicenseCard";
import { NoticeCard } from "@/components/cards/NoticeCard";
import { WorkCard } from "@/components/cards/WorkCard";
import { useLatestLicenses, useNotices, useWorks } from "@/lib/hooks/useLicenseHunter";

// Where each card sits in the fanned layout, as percentages of the stage, and how it is turned.
// The cards apply the turn themselves (--base-ry, --base-rz), so their glass layers keep their depth.
const FAN = [
  { left: "0%", top: "15%", ry: "24deg", rz: "-5deg", label: { left: "1%", top: "7%" } },
  { left: "33%", top: "6%", ry: "6deg", rz: "-1deg", label: { left: "34%", top: "-2%" } },
  { left: "66%", top: "17%", ry: "-18deg", rz: "5deg", label: { left: "67%", top: "9%" } },
];

/**
 * The hero's "Trace. Judge. Mint." as three live cards: a registered work, the newest open notice,
 * and the newest license, fanned out in 3D on wide screens and swipeable on phones.
 */
export function HeroStage() {
  const works = useWorks();
  const notices = useNotices();
  const licenses = useLatestLicenses(1);

  const workById = new Map((works.data ?? []).map((work) => [work.id, work]));
  const notice = (notices.data ?? []).filter((claim) => claim.status === "NOTICE_ISSUED").at(-1) ?? notices.data?.at(-1);
  const license = licenses.data?.[0];
  // Feature a work the other two cards don't show, so the three faces differ.
  const featured = new Set([notice?.workId, license?.workId]);
  const work = (works.data ?? []).find((candidate) => !featured.has(candidate.id)) ?? works.data?.[0];

  const steps: { index: string; label: string; card: ReactNode }[] = [
    { index: "01", label: "Trace", card: work ? <WorkCard work={work} /> : <CardSkeleton label="Registered work" /> },
    {
      index: "02",
      label: "Judge",
      card: notice ? <NoticeCard claim={notice} work={workById.get(notice.workId)} /> : <CardSkeleton label="Notice" />,
    },
    {
      index: "03",
      label: "Mint",
      card: license ? <LicenseCard license={license} work={workById.get(license.workId)} /> : <CardSkeleton label="License" />,
    },
  ];

  return (
    <>
      <div className="relative hidden aspect-[1.3/1] lg:block">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points="9,9 42,1 75,11"
            fill="none"
            stroke="var(--signal)"
            strokeWidth="1"
            strokeDasharray="5 4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {steps.map((step, index) => (
          <div key={step.index}>
            <p className="t-label absolute text-foreground" style={FAN[index].label}>
              <span className="t-index mr-2">{step.index}</span>
              {step.label}
            </p>
            <div
              className="float absolute w-[34%]"
              style={
                {
                  left: FAN[index].left,
                  top: FAN[index].top,
                  zIndex: index + 1,
                  "--base-ry": FAN[index].ry,
                  "--base-rz": FAN[index].rz,
                  "--delay": `${index * -2300}ms`,
                } as CSSProperties
              }
            >
              {step.card}
            </div>
          </div>
        ))}
      </div>

      {/* The vertical padding leaves room for the cards' glow inside the scroller. */}
      <div className="-mx-4 -my-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 py-6 [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
        {steps.map((step) => (
          <div key={step.index} className="flex w-[72%] max-w-xs shrink-0 snap-center flex-col">
            <p className="t-label mb-2 text-foreground">
              <span className="t-index mr-2">{step.index}</span>
              {step.label}
            </p>
            <div className="flex-1">{step.card}</div>
          </div>
        ))}
      </div>
    </>
  );
}
