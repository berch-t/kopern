import type { Metadata } from "next";
import { PricingJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn ? "Pricing — Plans & Billing" : "Tarifs — Plans et facturation",
    description: isEn
      ? "Kopern pricing — free Starter tier, Pro at $79/mo with grading & connectors, Usage-based billing for scale, Enterprise at $499/mo. Build AI agents with tool calling, multi-agent teams, MCP endpoints, and external connectors."
      : "Tarifs Kopern — Starter gratuit, Pro à 79$/mois avec grading et connecteurs, facturation à l'usage, Enterprise à 499$/mois. Construisez des agents IA avec tool calling, équipes multi-agents, endpoints MCP et connecteurs externes.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/pricing`,
      languages: { en: `${SITE_URL}/en/pricing`, fr: `${SITE_URL}/fr/pricing` },
    },
    openGraph: {
      title: isEn ? "Pricing — Kopern" : "Tarifs — Kopern",
      description: isEn
        ? "Free tier available. Pro, Usage-based, and Enterprise plans for production AI agents with tool calling, grading, teams, and external connectors."
        : "Offre gratuite disponible. Plans Pro, Usage et Enterprise pour les agents IA en production avec tool calling, grading, équipes et connecteurs.",
      url: `${SITE_URL}/${locale}/pricing`,
    },
  };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PricingJsonLd />
      {children}
    </>
  );
}
