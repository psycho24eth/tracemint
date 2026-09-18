import type { ReactNode } from "react";

// Server component shared by the demo blog pages: a plain editorial site, unrelated to TraceMint's
// own look. Blog pages must never show a 0x... address.
export function BlogFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[#fbf8f2] text-[#23201b] [font-family:Georgia,'Times_New_Roman',serif]">
      <header className="border-b border-[#e6dfd2]">
        <div className="mx-auto flex max-w-3xl items-baseline justify-between px-6 py-5">
          <p className="text-2xl font-bold italic">Synthwave Weekly</p>
          <p className="text-sm text-[#8a8174] [font-family:ui-sans-serif,system-ui,sans-serif]">Digital art, every Friday</p>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-6 py-12">{children}</article>
      <footer className="border-t border-[#e6dfd2] py-8 text-center text-xs text-[#a39a8c] [font-family:ui-sans-serif,system-ui,sans-serif]">
        © 2026 Synthwave Weekly
      </footer>
    </main>
  );
}

export function BlogFigure({
  image,
  alt,
  caption,
  credit,
  terms,
}: {
  image: string;
  alt: string;
  caption?: string;
  credit?: string;
  terms?: string;
}) {
  return (
    <figure className="mt-8 overflow-hidden rounded-lg border border-[#e6dfd2] bg-white p-3">
      {/* Plain <img>, never next/image: the file the agent hashes must be the file this page serves. */}
      <img src={image} alt={alt} className="w-full rounded" width={1200} height={800} />
      <figcaption className="mt-3 px-2 pb-2 text-sm [font-family:ui-sans-serif,system-ui,sans-serif]">
        {caption && <p className="text-[#6f6759]">{caption}</p>}
        {credit && <p className="mt-1 font-medium text-[#23201b]">{credit}</p>}
        {terms && <p className="mt-1 text-[#6f6759]">License: {terms}.</p>}
      </figcaption>
    </figure>
  );
}
