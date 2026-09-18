"use client";

import type { CSSProperties, ReactNode } from "react";

import { CardSkeleton } from "@/components/cards/Collectible";
import { LicenseCard } from "@/components/cards/LicenseCard";
import { NoticeCard } from "@/components/cards/NoticeCard";
import { WorkCard } from "@/components/cards/WorkCard";
import { useLatestLicenses, useNotices, useWorks } from "@/lib/hooks/useLicenseHunter";

// Where each card sits in the fanned 3D layout, as percentages of the stage.
const FAN = [
  { left: "0%", top: "15%", transform: "rotateY(24deg) rotateZ(-5deg)", label: { left: "1%", top: "7%" } },
  { left: "33%", top: "6%", transform: "rotateY(6deg) rotateZ(-1deg)", label: { left: "34%", top: "-2%" } },
  { left: "66%", top: "17%", transform: "rotateY(-18deg) rotateZ(5deg)", label: { left: "67%", top: "9%" } },
];

/**
 * The hero's "Trace. Judge. Mint." as three live cards: the first registered work, the newest
 * open notice, and the newest license, fanned out in 3D on wide screens and swipeable on phones.
 */
export function HeroStage() {
  const works = useWorks();
  const notices = useNotices();
  const licenses = useLatestLicenses(1);

  const workById = new Map((works.data ?? []).map((work) => [work.id, work]));
  const work = works.data?.[0];
  const notice = (notices.data ?? []).filter((claim) => claim.status === "NOTICE_ISSUED").at(-1) ?? notices.data?.at(-1);
  const license = licenses.data?.[0];

  const steps: { index: string; label: string; card: ReactNode }[] = [
    { index: "01", label: "Trace", card: work ? <WorkCard work={work} tilt={false} /> : <CardSkeleton label="Registered work" /> },
    {
      index: "02",
      label: "Judge",
      card: notice ? <NoticeCard claim={notice} work={workById.get(notice.workId)} tilt={false} /> : <CardSkeleton label="Notice" />,
    },
    {
      index: "03",
      label: "Mint",
      card: license ? <LicenseCard license={license} work={workById.get(license.workId)} tilt={false} /> : <CardSkeleton label="License" />,
    },
  ];

  return (
    <>
      <div className="relative hidden aspect-[1.3/1] [perspective:1600px] lg:block">
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
                  transform: FAN[index].transform,
                  zIndex: index + 1,
                  "--delay": `${index * -2300}ms`,
                } as CSSProperties
              }
            >
              {step.card}
            </div>
          </div>
        ))}
      </div>

      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:hidden">
        {steps.map((step) => (
          <div key={step.index} className="w-[72%] max-w-xs shrink-0 snap-center">
            <p className="t-label mb-2 text-foreground">
              <span className="t-index mr-2">{step.index}</span>
              {step.label}
            </p>
            {step.card}
          </div>
        ))}
      </div>
    </>
  );
}
