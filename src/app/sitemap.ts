import type { MetadataRoute } from "next";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export default function sitemap(): MetadataRoute.Sitemap {
  const locales = ["en", "fr"];
  // Fixed date — update only on real deploys (dynamic dates waste crawl budget)
  const lastDeploy = "2026-04-22T00:00:00.000Z";

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
    { path: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
  ];

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const route of publicRoutes) {
      entries.push({
        url: `${SITE_URL}/${locale}${route.path}`,
        lastModified: lastDeploy,
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

  // Blog post URLs — only emit the locale the post was authored in
  // (prevents /en/blog/<fr-slug> phantom URLs that 404-in-spirit)
  const slugs = getAllSlugs();
  for (const slug of slugs) {
    const post = getPostBySlug(slug);
    if (!post) continue;
    const locale = post.locale === "fr" ? "fr" : "en";
    entries.push({
      url: `${SITE_URL}/${locale}/blog/${slug}`,
      lastModified: post.date || lastDeploy,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    });
  }

  return entries;
}
