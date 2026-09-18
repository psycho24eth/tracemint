import type { ReactNode } from "react";

/** A numbered section header: index and kicker in mono, the title in condensed display type. */
export function SectionHeading({
  index,
  kicker,
  title,
  children,
  as: Tag = "h2",
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
  as?: "h1" | "h2";
}) {
  return (
    <div className="grid gap-4 border-t border-line pt-5 md:grid-cols-12 md:gap-6">
      <p className="t-label md:col-span-3">
        {index && <span className="t-index mr-2">{index}</span>}
        {kicker}
      </p>
      <div className="md:col-span-9">
        <Tag className="display-condensed text-5xl md:text-7xl">{title}</Tag>
        {children && <div className="mt-4 max-w-2xl text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
