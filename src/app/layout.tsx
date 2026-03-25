import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";
const SITE_NAME = "Kopern";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1625" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "Kopern — AI Agent Builder, Orchestrator & Grader",
    template: "%s | Kopern",
  },
  description:
    "Build, test, deploy, and connect production-grade AI agents with tool calling, deterministic grading, multi-agent teams, MCP endpoints, and external connectors. Embed on websites, trigger via webhooks, or install as Slack bots. Supports Claude, GPT, Gemini, Mistral, and Ollama.",

  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "AI agent builder",
    "AI agent platform",
    "AI agent grading",
    "LLM agent orchestration",
    "custom AI tools",
    "tool calling",
    "AI agent testing",
    "multi-agent teams",
    "MCP server",
    "Model Context Protocol",
    "Claude agent",
    "GPT agent",
    "Gemini agent",
    "Mistral agent",
    "AI automation",
    "AI pipeline builder",
    "agentic AI",
    "agent evaluation",
    "AI grading",
    "no-code AI agent",
    "AI agent deployment",
    "AI chat widget",
    "AI webhook integration",
    "AI Slack bot",
    "embeddable AI chat",
    "AI agent connector",
    "n8n AI agent",
    "Zapier AI agent",
    "AI agent API",
    "AI agent optimization",
    "prompt optimization",
    "AI agent sandbox",
    "constructeur agent IA",
    "agent IA personnalisé",
    "orchestration multi-agents",
    "évaluation agent IA",
    "chatbot IA personnalisé",
    "déploiement agent IA",
  ],

  authors: [{ name: "Kopern", url: SITE_URL }],
  creator: "Kopern",
  publisher: "Kopern",

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },

  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Kopern — AI Agent Builder, Orchestrator & Grader",
    description:
      "Build production-grade AI agents with tool calling, deterministic grading, multi-agent teams, MCP endpoints, and external connectors (widget, webhooks, Slack). Supports Claude, GPT, Gemini, and Mistral.",
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: "fr_FR",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Kopern — AI Agent Builder Platform",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Kopern — AI Agent Builder, Orchestrator & Grader",
    description:
      "Build, test, deploy, and connect production-grade AI agents with tool calling, grading, multi-agent teams, and external connectors.",
    images: ["/twitter-image"],
    creator: "@kopern_ai",
  },

  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  alternates: {
    canonical: SITE_URL,
    languages: {
      en: `${SITE_URL}/en`,
      fr: `${SITE_URL}/fr`,
    },
  },

  category: "technology",

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },

  manifest: "/manifest.webmanifest",

  other: {
    "google-site-verification": process.env.GOOGLE_SITE_VERIFICATION || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
