import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BlogFigure, BlogFrame } from "@/components/demo/BlogFrame";
import { blogCopies } from "@/lib/demo/catalog";

export const metadata: Metadata = {
  robots: "noindex",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return blogCopies().map(({ copy }) => ({ slug: copy.slug }));
}

// An article either credits the creator (validators should find the copy licensed) or uses the
// image without any credit (validators should issue an editorial notice). No 0x... address, ever.
export default async function DemoBlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = blogCopies().find(({ copy }) => copy.slug === slug);
  if (!entry) notFound();

  const { work, copy } = entry;
  return (
    <BlogFrame>
      <p className="text-sm uppercase tracking-widest text-[#8a8174] [font-family:ui-sans-serif,system-ui,sans-serif]">
        Feature · 4 min read
      </p>
      <h1 className="mt-2 text-4xl font-bold leading-tight">{copy.headline}</h1>
      <p className="mt-4 text-lg leading-relaxed text-[#4a443b]">{copy.intro}</p>

      <BlogFigure
        image={copy.image}
        alt={copy.caption}
        caption={copy.caption}
        credit={copy.credit}
        terms={copy.credit ? work.terms.toLowerCase() : undefined}
      />

      <p className="mt-8 leading-relaxed text-[#4a443b]">
        Good digital painting rewards a second look: the edges stay crisp, the color shifts are deliberate, and the
        composition leaves room to breathe. That is exactly what makes a piece like this work as a daily backdrop.
      </p>
      <p className="mt-4 leading-relaxed text-[#4a443b]">
        Tell us what you would like to see featured next week. We read every reply, even the ones about fonts.
      </p>
    </BlogFrame>
  );
}
