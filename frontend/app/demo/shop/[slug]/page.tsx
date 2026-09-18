import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ShopProductPage } from "@/components/demo/ShopProductPage";
import { shopCopies } from "@/lib/demo/catalog";

export const metadata: Metadata = {
  robots: "noindex",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return shopCopies().map(({ copy }) => ({ slug: copy.slug }));
}

export default async function DemoShopProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = shopCopies().find(({ copy }) => copy.slug === slug);
  if (!entry) notFound();

  const { copy } = entry;
  return (
    <ShopProductPage
      image={copy.image}
      alt={copy.product}
      name={copy.product}
      price={copy.price}
      description={copy.description}
      details={copy.details}
    />
  );
}
