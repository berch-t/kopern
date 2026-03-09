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
    title: isEn ? "Agent Templates & Examples" : "Modèles et exemples d'agents IA",
    description: isEn
      ? "Browse 15+ ready-to-use AI agent templates — code review, data analysis, customer support, content creation, security audit, and more. Clone and customize in minutes."
      : "Parcourez plus de 15 modèles d'agents IA prêts à l'emploi — revue de code, analyse de données, support client, création de contenu, audit sécurité, et plus.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/examples`,
      languages: { en: `${SITE_URL}/en/examples`, fr: `${SITE_URL}/fr/examples` },
    },
    openGraph: {
      title: isEn ? "AI Agent Templates — Kopern" : "Modèles d'agents IA — Kopern",
      description: isEn
        ? "15+ production-ready AI agent templates. Clone, customize, and deploy."
        : "Plus de 15 modèles d'agents IA prêts pour la production.",
      url: `${SITE_URL}/${locale}/examples`,
    },
  };
}

export default function ExamplesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
