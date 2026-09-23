"use client";

import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTour } from "@/components/tour/GuidedTour";
import { NetworkBanner } from "@/components/wallet/NetworkBanner";
import { WalletButton } from "@/components/wallet/WalletButton";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";

import { JudgeModeBar } from "./JudgeModeBar";
import { Logo } from "./Logo";

const LINKS: { href: string; label: string; tour?: string }[] = [
  { href: "/works", label: "Works", tour: "nav-works" },
  { href: "/notices", label: "Notices", tour: "nav-notices" },
  { href: "/dashboard", label: "Dashboard", tour: "nav-dashboard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/judges", label: "Judges", tour: "nav-judges" },
];

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {LINKS.map((link, index) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            data-tour={link.tour}
            aria-current={active ? "page" : undefined}
            className={`group relative whitespace-nowrap px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="t-index mr-1.5">{String(index + 1).padStart(2, "0")}</span>
            {link.label}
            <span
              className={`absolute inset-x-3 -bottom-px h-px bg-signal transition-transform duration-200 ${
                active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
              }`}
              aria-hidden="true"
            />
          </Link>
        );
      })}
    </>
  );
}

export function Navbar() {
  const pathname = usePathname() ?? "";
  const { role } = useDemoMode();
  const tour = useTour();
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label="TraceMint home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center md:flex" aria-label="Main">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="flex items-center gap-3 md:gap-4">
          <span className="t-label hidden items-center gap-2 lg:flex">
            <span className="live-dot" aria-hidden="true" />
            Studio Next
          </span>
          <button
            type="button"
            onClick={tour.start}
            data-tour="guide"
            aria-label="Take the guided tour"
            className="flex h-8 items-center gap-1.5 px-1.5 text-xs uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <CircleHelp className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Guide</span>
          </button>
          {role === null && <WalletButton />}
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-line px-2 md:hidden" aria-label="Main">
        <NavLinks pathname={pathname} />
      </nav>
      {role === null && <NetworkBanner />}
      <JudgeModeBar />
    </header>
  );
}
