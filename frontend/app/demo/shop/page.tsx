import type { Metadata } from "next";

import { ShopProductPage } from "@/components/demo/ShopProductPage";

export const metadata: Metadata = {
  robots: "noindex",
};

export default function DemoShopPage() {
  return (
    <ShopProductPage
      image="/demo/synth-hoodie-banner.jpg"
      alt="Synth hoodie, front view"
      name="Synth hoodie"
      price="$49"
      description="Heavyweight fleece, oversized fit, printed all-over with our house neon grid graphic. Runs true to size and holds its shape wash after wash."
      details={["Sizes: S - XXL", "Ships in 3-5 business days", "Free returns within 30 days"]}
    />
  );
}
