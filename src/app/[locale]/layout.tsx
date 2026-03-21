import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { getDictionary } from "@/i18n/getDictionary";
import { locales, type Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrganizationJsonLd, SoftwareApplicationJsonLd, FAQJsonLd } from "@/components/seo/JsonLd";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isEn = locale === "en";

  return {
    title: isEn
      ? "Kopern — AI Agent Builder, Orchestrator & Grader"
      : "Kopern — Constructeur, Orchestrateur et Évaluateur d'agents IA",
    description: isEn
      ? "Build, test, deploy, and connect production-grade AI agents with tool calling, grading, multi-agent teams, MCP endpoints, and external connectors (widget, webhooks, Slack). Supports Claude, GPT, Gemini, and Mistral."
      : "Créez, testez, déployez et connectez des agents IA de qualité production avec tool calling, grading, équipes multi-agents, endpoints MCP et connecteurs externes (widget, webhooks, Slack). Compatible Claude, GPT, Gemini et Mistral.",
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages: { en: `${SITE_URL}/en`, fr: `${SITE_URL}/fr` },
    },
    openGraph: {
      url: `${SITE_URL}/${locale}`,
      locale: isEn ? "en_US" : "fr_FR",
    },
  };
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  const dictionary = await getDictionary(locale as Locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <OrganizationJsonLd />
        <SoftwareApplicationJsonLd />
        <FAQJsonLd />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TooltipProvider>
            <LocaleProvider locale={locale as Locale} dictionary={dictionary}>
              {children}
            </LocaleProvider>
          </TooltipProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
