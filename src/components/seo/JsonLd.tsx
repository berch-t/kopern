const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.vercel.app";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kopern",
    url: SITE_URL,
    logo: `${SITE_URL}/logo_small.png`,
    description:
      "Build, test, and deploy production-grade AI agents with tool calling, grading pipelines, multi-agent teams, and MCP server endpoints.",
    sameAs: [],
    foundingDate: "2024",
    knowsAbout: [
      "Artificial Intelligence",
      "AI Agents",
      "Large Language Models",
      "Tool Calling",
      "Agent Orchestration",
      "Model Context Protocol",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function SoftwareApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kopern",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "AI Agent Builder platform — create custom AI agents with tool calling (Claude, GPT, Gemini), test with deterministic grading, orchestrate multi-agent teams, and expose via MCP endpoints.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "99",
      offerCount: "4",
    },
    featureList: [
      "Custom AI agent creation with system prompts and skills",
      "Tool calling with JSON Schema and sandboxed JavaScript execution",
      "Multi-provider LLM support: Anthropic Claude, OpenAI GPT, Google Gemini, Ollama",
      "Deterministic grading with 6 criterion types",
      "Multi-agent team orchestration (parallel, sequential, conditional)",
      "Pipeline chains with input/output mapping",
      "GitHub repository integration with read_file and search_files tools",
      "MCP (Model Context Protocol) server endpoints with API key auth",
      "Real-time SSE streaming for chat, grading, and execution",
      "Purpose Gate for session-scoped agent focus",
      "TillDone mode for multi-step task enforcement",
      "Agent branding with custom icons and colors",
      "Extension hooks for safety, logging, and compliance",
      "Real-time billing and usage tracking per agent",
      "Internationalization (English and French)",
      "Meta-agent wizard for AI-assisted agent creation",
    ],
    screenshot: `${SITE_URL}/og-image.png`,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd() {
  const faqs = [
    {
      question: "What is Kopern?",
      answer:
        "Kopern is an AI agent builder platform that lets you create, test, and deploy production-grade AI agents. You can configure custom tools, connect GitHub repos, build multi-agent teams, and validate everything with deterministic grading pipelines.",
    },
    {
      question: "Which AI models does Kopern support?",
      answer:
        "Kopern supports Anthropic Claude (Opus, Sonnet, Haiku), OpenAI GPT (GPT-4o, GPT-4o-mini), Google Gemini (2.5 Flash), and local models via Ollama. Each agent can be configured with a different model and thinking level.",
    },
    {
      question: "What is agent grading?",
      answer:
        "Agent grading lets you create test suites with specific criteria to automatically validate your agent's behavior. Kopern supports 6 criterion types: output match, schema validation, tool usage, safety checks, custom scripts, and LLM-as-judge evaluation.",
    },
    {
      question: "Can I connect my own GitHub repositories?",
      answer:
        "Yes. Connect your GitHub repos via OAuth and your agents get built-in read_file and search_files tools, plus the repo tree and README injected into context. Agents can read and analyze your codebase during conversations.",
    },
    {
      question: "What is MCP (Model Context Protocol)?",
      answer:
        "MCP is an open standard for connecting AI agents to external tools and data sources. Kopern lets you expose any agent as an MCP server with API key authentication, so other applications can call your agents via JSON-RPC.",
    },
    {
      question: "How does multi-agent orchestration work?",
      answer:
        "Kopern supports agent teams with three execution modes: parallel (all agents run simultaneously), sequential (agents run one after another), and conditional (routing based on input). Each agent in a team keeps its own tools, skills, and configuration.",
    },
    {
      question: "Is Kopern free to use?",
      answer:
        "Kopern offers a free Starter tier for individual use. Pro, Usage-based, and Enterprise tiers are available for teams and production workloads with higher limits and advanced features.",
    },
  ];

  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
