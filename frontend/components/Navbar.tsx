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
  { href: "/judges", label: "Judges" },
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
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" aria-label="TraceMint home" className="shrink-0">
          <Logo />
        </Link>
        <nav className="hidden items-center md:flex" aria-label="Main">
          <NavLinks pathname={pathname} />
        </nav>
        <div className="flex items-center gap-4">
          <span className="t-label hidden items-center gap-2 lg:flex">
            <span className="live-dot" aria-hidden="true" />
            Studio Next
          </span>
          {role === null && <AccountPanel />}
        </div>
      </div>
      <nav className="flex overflow-x-auto border-t border-line px-2 md:hidden" aria-label="Main">
        <NavLinks pathname={pathname} />
      </nav>
      <JudgeModeBar />
    </header>
  );
}
