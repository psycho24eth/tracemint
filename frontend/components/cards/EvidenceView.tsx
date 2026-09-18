import { pageLabel } from "@/lib/format";

/**
 * The page where a copy was found, drawn as a small browser window: the copy with the agent's
 * detection box, and the registered original inset in the corner.
 */
export function EvidenceView({ pageUrl, found, original }: { pageUrl: string; found: string; original?: string }) {
  return (
    <div className="overflow-hidden rounded-md bg-[#ededea] text-[#3a3a37]">
      <div className="flex items-center gap-1 bg-[#d6d6d2] px-2 py-1.5" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-[#a9a9a4]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#a9a9a4]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#a9a9a4]" />
        <span className="ml-1 flex-1 truncate rounded-full bg-[#f4f4f1] px-2 py-0.5 text-[0.55rem] tracking-[0.04em]">
          {pageLabel(pageUrl)}
        </span>
      </div>
      <div className="relative p-1.5">
        <img src={found} alt="Copy found on the page" className="aspect-[4/3] w-full object-cover" />
        <div className="scanline absolute inset-3 border-2 border-signal shadow-[0_0_0_999px_rgb(11_11_11/0.18)]" aria-hidden="true">
          <span className="absolute left-[-2px] top-0 -translate-y-full bg-signal px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-background">
            Match
          </span>
        </div>
        {original && (
          <figure className="absolute bottom-3 right-3 w-[34%] border-2 border-white shadow-[0_6px_14px_rgb(0_0_0/0.45)]">
            <figcaption className="absolute left-[-2px] top-0 -translate-y-full bg-background px-1 py-0.5 text-[0.5rem] font-bold uppercase tracking-[0.12em] text-foreground">
              Original
            </figcaption>
            <img src={original} alt="Registered original" className="aspect-[3/2] w-full object-cover" />
          </figure>
        )}
      </div>
    </div>
  );
}
