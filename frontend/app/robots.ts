import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // The demo pages exist to be caught by the agent during a walkthrough; they are not content.
      { userAgent: "*", allow: "/", disallow: ["/demo/", "/api/"] },
    ],
    sitemap: canonicalUrl("/sitemap.xml"),
    host: canonicalUrl(),
  };
}
