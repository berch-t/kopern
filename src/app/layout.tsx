import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";
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
    "Build, test, and deploy production-grade AI agents with tool calling, grading pipelines, multi-agent teams, and MCP server endpoints. Connect GitHub repos, create custom tools, and validate everything with deterministic grading. Supports Claude, GPT, and Gemini.",

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
    "AI automation",
    "AI pipeline builder",
    "agentic AI",
    "agent evaluation",
    "AI grading",
    "no-code AI agent",
    "AI agent deployment",
    "constructeur agent IA",
    "agent IA personnalisé",
    "orchestration multi-agents",
    "évaluation agent IA",
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
      "Build production-grade AI agents with tool calling, deterministic grading, multi-agent teams, and MCP endpoints. Supports Claude, GPT, and Gemini.",
    url: SITE_URL,
    locale: "en_US",
    alternateLocale: "fr_FR",
    images: [
      {
        url: "/og-image.png",
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
      "Build, test, and deploy production-grade AI agents with tool calling, grading pipelines, and multi-agent orchestration.",
    images: ["/og-image.png"],
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
