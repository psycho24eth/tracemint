import Link from "next/link";

import { addressLink } from "@/lib/format";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-12 md:px-6">
        <div className="md:col-span-6">
          <p className="t-label">Provenance, enforced on-chain</p>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            TraceMint runs on GenLayer Studio Next. Notices are automated findings reached by validator consensus, not
            legal advice.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs uppercase tracking-[0.14em] md:col-span-6 md:justify-end" aria-label="Footer">
          <Link href="/judges" className="t-link">
            Judges
          </Link>
          <a href="https://github.com/psycho24eth/tracemint" className="t-link">
            GitHub
          </a>
          {CONTRACT_ADDRESS && (
            <a href={addressLink(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="t-link">
              Contract
            </a>
          )}
        </nav>
      </div>
      <p
        className="display-condensed pointer-events-none select-none px-2 text-center text-[24vw] leading-[0.78] text-transparent [-webkit-text-stroke:1px_rgb(234_234_229/0.14)]"
        aria-hidden="true"
      >
        TRACEMINT
      </p>
    </footer>
  );
}
