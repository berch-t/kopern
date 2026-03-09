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
    title: isEn ? "Pricing" : "Tarifs",
    description: isEn
      ? "Kopern pricing — free Starter tier, Pro for teams, Usage-based for scale, Enterprise for custom deployments. Build AI agents at any scale."
      : "Tarifs Kopern — offre Starter gratuite, Pro pour les équipes, à l'usage pour le scale, Enterprise pour les déploiements personnalisés.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/pricing`,
      languages: { en: `${SITE_URL}/en/pricing`, fr: `${SITE_URL}/fr/pricing` },
    },
    openGraph: {
      title: isEn ? "Pricing — Kopern" : "Tarifs — Kopern",
      description: isEn
        ? "Free to start. Scale as you grow. Build AI agents at any budget."
        : "Gratuit pour commencer. Évoluez selon vos besoins.",
      url: `${SITE_URL}/${locale}/pricing`,
    },
  };
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
