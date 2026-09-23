import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/seo";

const ROUTES = [
  { path: "/", priority: 1, changeFrequency: "daily" as const },
  { path: "/faq", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/pricing", priority: 0.9, changeFrequency: "monthly" as const },
  { path: "/works", priority: 0.8, changeFrequency: "hourly" as const },
  { path: "/notices", priority: 0.8, changeFrequency: "hourly" as const },
  { path: "/dashboard", priority: 0.4, changeFrequency: "daily" as const },
  { path: "/judges", priority: 0.5, changeFrequency: "monthly" as const },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: canonicalUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
