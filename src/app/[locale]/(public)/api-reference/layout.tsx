import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn ? "API Reference" : "Reference API",
    description: isEn
      ? "Kopern API Reference — complete documentation for all endpoints including OpenAI-compatible chat completions, webhooks, MCP protocol, widget embedding, Slack, Telegram, and WhatsApp integrations."
      : "Reference API Kopern — documentation complete de tous les endpoints incluant les completions de chat compatibles OpenAI, webhooks, protocole MCP, widget embarquable, integrations Slack, Telegram et WhatsApp.",
    alternates: {
      canonical: `${SITE_URL}/${locale}/api-reference`,
      languages: { en: `${SITE_URL}/en/api-reference`, fr: `${SITE_URL}/fr/api-reference` },
    },
    openGraph: {
      title: isEn ? "API Reference — Kopern" : "Reference API — Kopern",
      description: isEn
        ? "Complete API documentation for building integrations with Kopern AI agents."
        : "Documentation API complete pour construire des integrations avec les agents IA Kopern.",
      url: `${SITE_URL}/${locale}/api-reference`,
    },
  };
}

export default function ApiReferenceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
