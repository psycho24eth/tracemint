"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * The reading material, behind one nav item. Six flat links would not fit beside the app's own
 * three, and a visitor deciding whether to trust this is looking for one thing — an explanation —
 * not six.
 */
export const LEARN_LINKS = [
  { href: "/how-it-works", label: "How it works", hint: "The five stages, and what a validator reads" },
  { href: "/pricing", label: "Pricing", hint: "Free to scan. 3% of a licence we collect" },
  { href: "/faq", label: "Questions and answers", hint: "Straight answers, including the awkward ones" },
  { href: "/docs", label: "Developer docs", hint: "Every contract method and who may call it" },
  { href: "/about", label: "About", hint: "Why this exists, and what it does not claim" },
  { href: "/judges", label: "Verify in five minutes", hint: "Run the whole flow on chain yourself" },
] as const;

export function LearnMenu() {
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement | null>(null);

  const active = LEARN_LINKS.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));

  // Close on Escape or on a click anywhere else, the two things people try.
  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: MouseEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  // A route change means the visitor followed a link; the panel has done its job.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`group flex items-center gap-1 whitespace-nowrap px-3 py-2 text-xs uppercase tracking-[0.14em] transition-colors ${
          active || open ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Learn
        <ChevronDown
          className={`size-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
        <span
          className={`absolute inset-x-3 bottom-0 h-px bg-signal transition-transform duration-200 ${
            active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-px w-[19rem] border border-[var(--line-strong)] bg-background shadow-[0_18px_40px_rgb(0_0_0_/_0.55)]">
          <ul>
            {LEARN_LINKS.map((link) => {
              const current = pathname === link.href;
              return (
                <li key={link.href} className="border-b border-line last:border-b-0">
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className="block px-4 py-3 transition-colors hover:bg-muted"
                  >
                    <span className={`block text-sm ${current ? "text-signal" : "text-foreground"}`}>{link.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{link.hint}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
