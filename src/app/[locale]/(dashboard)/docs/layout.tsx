import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn ? "Documentation" : "Documentation",
    description: isEn
      ? "Kopern documentation — learn how to build AI agents with tool calling, grading pipelines, multi-agent teams, GitHub integration, MCP endpoints, and more."
      : "Documentation Kopern — apprenez à construire des agents IA avec tool calling, pipelines de grading, équipes multi-agents, intégration GitHub, endpoints MCP, et plus.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/docs`,
      languages: { en: `${SITE_URL}/en/docs`, fr: `${SITE_URL}/fr/docs` },
    },
    openGraph: {
      title: isEn ? "Documentation — Kopern" : "Documentation — Kopern",
      description: isEn
        ? "Complete guide to building production-grade AI agents on Kopern."
        : "Guide complet pour construire des agents IA sur Kopern.",
      url: `${SITE_URL}/${locale}/docs`,
    },
  };
}

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
