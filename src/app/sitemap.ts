import type { MetadataRoute } from "next";
import { getAllPosts, getAllSlugs } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["en", "fr"];
  const now = new Date().toISOString();

  // Public pages to index
  const publicRoutes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/examples", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.85, changeFrequency: "monthly" as const },
    { path: "/docs", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/api-reference", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/mcp", priority: 0.75, changeFrequency: "monthly" as const },
    { path: "/grader", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/monitor", priority: 0.85, changeFrequency: "weekly" as const },
    { path: "/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/login", priority: 0.3, changeFrequency: "monthly" as const },
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of publicRoutes) {
      entries.push({
        url: `${SITE_URL}/${locale}${route.path}`,
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}${route.path}`])
          ),
        },
      });
    }
  }

  // Blog post URLs
  const slugs = getAllSlugs();
  for (const slug of slugs) {
    for (const locale of locales) {
      entries.push({
        url: `${SITE_URL}/${locale}/blog/${slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, `${SITE_URL}/${l}/blog/${slug}`])
          ),
        },
      });
    }
  }

  return entries;
}
