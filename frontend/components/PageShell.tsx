import type { ReactNode } from "react";

import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function PageShell({ children, bleed = false }: { children: ReactNode; bleed?: boolean }) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div className="page-rules" aria-hidden="true" />
      <div className="page-grain" aria-hidden="true" />
      <Navbar />
      <main className={bleed ? "w-full flex-1" : "mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-6 md:py-14"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
