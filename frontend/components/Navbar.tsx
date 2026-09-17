"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoMode } from "@/lib/demo/DemoModeProvider";

import { AccountPanel } from "./AccountPanel";
import { JudgeModeBar } from "./JudgeModeBar";
import { Logo } from "./Logo";

const LINKS = [
  { href: "/works", label: "Works" },
  { href: "/notices", label: "Notices" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/judges", label: "For judges" },
];

function NavLinks({ pathname, compact }: { pathname: string; compact?: boolean }) {
  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-3 ${compact ? "py-1 text-xs" : "py-2 text-sm"} transition-colors ${
              active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

export function Navbar() {
  const pathname = usePathname() ?? "";
  const { role } = useDemoMode();
  return (
    <header className="brand-navbar sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="TraceMint home">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="flex items-center gap-2">{role === null && <AccountPanel />}</div>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden" aria-label="Main">
        <NavLinks pathname={pathname} compact />
      </nav>
      <JudgeModeBar />
    </header>
  );
}
