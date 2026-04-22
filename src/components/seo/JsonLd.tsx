const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kopern.ai";

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Kopern",
    url: SITE_URL,
    logo: `${SITE_URL}/logo_small.png`,
    description:
      "Build, test, deploy, and connect production-grade AI agents with tool calling, deterministic grading, multi-agent teams, MCP endpoints, and external connectors.",
    sameAs: [
      "https://github.com/berch-t/kopern",
      "https://www.npmjs.com/package/@kopern/mcp-server",
      "https://www.linkedin.com/company/kopern",
      "https://www.wikidata.org/wiki/Q138958921",
    ],
    foundingDate: "2026",
    address: {
      "@type": "PostalAddress",
      addressCountry: "FR",
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "contact@kopern.ai",
      url: `${SITE_URL}/en/pricing`,
      availableLanguage: ["English", "French"],
    },
    knowsAbout: [
      "Artificial Intelligence",
      "AI Agents",
      "Large Language Models",
      "Tool Calling",
      "Agent Orchestration",
      "Model Context Protocol",
      "AI Agent Testing",
      "AI Agent Grading",
      "Webhook Integration",
      "Slack Bot Development",
      "AI Workflow Monitoring",
      "AI Quality Assurance",
      "Social Media Automation",
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
    "@type": "WebApplication",
    name: "Kopern",
    applicationCategory: "DeveloperApplication",
    applicationSubCategory: "AI Agent Builder",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "AI Agent Builder platform — create custom AI agents with tool calling (Claude, GPT, Gemini, Mistral, Ollama), test with deterministic grading, orchestrate multi-agent teams, deploy via MCP endpoints, embeddable widget, webhooks, and Slack bot.",
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: "0",
      highPrice: "499",
      offerCount: "4",
      offers: [
        {
          "@type": "Offer",
          name: "Starter",
          price: "0",
          priceCurrency: "USD",
          description: "Free tier — 3 agents, 100K tokens/month",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "79",
          priceCurrency: "USD",
          billingDuration: "P1M",
          description: "25 agents, 2M tokens, grading, teams, connectors",
        },
        {
          "@type": "Offer",
          name: "Usage",
          price: "0",
          priceCurrency: "USD",
          description: "Pay per token — unlimited agents and features",
        },
        {
          "@type": "Offer",
          name: "Enterprise",
          price: "499",
          priceCurrency: "USD",
          billingDuration: "P1M",
          description: "Unlimited everything, priority support",
        },
      ],
    },
    featureList: [
      "Custom AI agent creation with system prompts, skills, and branding",
      "Tool calling with JSON Schema validation and sandboxed JavaScript execution",
      "Multi-provider LLM support: Anthropic Claude, OpenAI GPT, Google Gemini, Mistral AI, Ollama",
      "Deterministic grading with 6 criterion types (output match, schema validation, tool usage, safety, custom script, LLM judge)",
      "AutoResearch optimization lab (AutoTune, AutoFix, Stress Lab, Tournament, Distillation, Evolution)",
      "Multi-agent team orchestration (parallel, sequential, conditional)",
      "Pipeline chains with input/output mapping",
      "GitHub repository integration with read_file, search_files, and github_write tools",
      "MCP (Model Context Protocol) server endpoints with API key authentication",
      "Embeddable chat widget with Shadow DOM isolation and SSE streaming",
      "Webhook connectors (inbound and outbound) with HMAC-SHA256 signing",
      "Slack bot integration with OAuth, thread support, and reaction checkmarks",
      "Real-time SSE streaming for chat, grading, and execution",
      "Extension hooks for safety, logging, and compliance (30+ event types)",
      "Real-time billing and usage tracking per agent via Stripe",
      "Internationalization (English and French)",
      "Meta-agent wizard for AI-assisted agent creation",
      "Purpose Gate for session-scoped agent focus",
      "TillDone mode for multi-step task enforcement",
      "Built-in bug tracking with autonomous bug fixer agent",
      "Workflow Quality Monitor — 18 standardized tests across 6 criteria for continuous LLM quality monitoring",
      "Public Agent Grader — test any AI endpoint or system prompt with deterministic evaluation",
      "Social Media Integration — Bluesky AT Protocol with 9 tools for social media management",
      "Telegram bot and WhatsApp (Meta Cloud API) connectors",
      "Agent memory with persistent key-value storage and context compaction",
    ],
    screenshot: `${SITE_URL}/opengraph-image`,
    browserRequirements: "Requires JavaScript. Works in all modern browsers.",
    softwareVersion: "1.0",
    inLanguage: ["en", "fr"],
    isAccessibleForFree: true,
    creator: {
      "@type": "Organization",
      name: "Kopern",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export interface FAQItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FAQItem[] = [
  {
    question: "What is the difference between AI agents and chatbots?",
    answer:
      "AI agents autonomously execute multi-step tasks using tools (APIs, databases, code), while chatbots only reply with scripted text. Agents can reason, call external services, and decide what to do next; chatbots cannot. Use a chatbot for FAQs and an AI agent for multistep workflows like triaging tickets or running RAG pipelines.",
  },
  {
    question: "How do you build AI agents without coding?",
    answer:
      "No-code AI agent builders like Kopern let you create agents through a visual interface: describe the goal, pick a template or model, configure tools via JSON schemas, and deploy. No Python, no LangChain boilerplate. Most production agents can ship in 15–60 minutes through drag-and-drop workflow editors and pre-built connectors.",
  },
  {
    question: "What is the best alternative to CrewAI and LangChain?",
    answer:
      "Kopern is a no-code alternative to CrewAI and LangChain with built-in grading, MCP endpoints, multi-agent teams, and deployment connectors (Slack, widget, webhooks). Unlike framework-only tools, Kopern handles the full lifecycle: build, test, grade, deploy, monitor. No Python required, works with Claude, GPT, Gemini, Mistral, and Ollama.",
  },
  {
    question: "How much does it cost to deploy AI agents in production?",
    answer:
      "Running an AI agent in production typically costs $0.01–$0.30 per conversation depending on the model and context size. Platform costs range from free tiers to $79/month for production features. Expect 30–40% lower operational costs vs traditional chatbots once deployed, thanks to higher resolution rates and autonomous handling.",
  },
  {
    question: "How do you test and evaluate an AI agent?",
    answer:
      "Test AI agents with a grading suite: define test cases with inputs and expected behaviors, then evaluate with six criterion types — output match, schema validation, tool usage, safety, custom scripts, and LLM-as-judge. Run the suite on every prompt change to catch regressions. Kopern automates this with AutoTune and AutoFix for continuous improvement.",
  },
  {
    question: "What is silent degradation in LLM agents?",
    answer:
      "Silent degradation is when an AI agent still returns syntactically valid outputs, but semantic quality drops over time — caused by model updates, data drift, or prompt decay. It is common in RAG pipelines. Detect it with scheduled grading (daily test runs), anomaly-based alerts, and continuous LLM observability on latency, faithfulness, and safety metrics.",
  },
  {
    question: "What is MCP (Model Context Protocol) and why does it matter?",
    answer:
      "MCP is an open standard (created by Anthropic) for connecting AI agents to external tools and data. Think USB-C for AI: one protocol, any service. Claude Code, Cursor, and VS Code all speak MCP. With Kopern, you can expose any agent as an MCP server and call it from your IDE, CI pipeline, or custom apps.",
  },
  {
    question: "How do I deploy an AI agent on my website?",
    answer:
      "Add a single <script> tag with your API key to embed a chat widget. The widget runs in a Shadow DOM for CSS isolation, streams via SSE, supports markdown and mobile. You can also deploy agents as MCP endpoints, webhooks, Slack bots, Telegram bots, or WhatsApp — all from the same dashboard without writing glue code.",
  },
  {
    question: "Are AI agents compliant with the EU AI Act?",
    answer:
      "Full enforcement of the EU AI Act starts August 2, 2026. High-risk AI agents must provide technical documentation, structured human oversight, audit trails, and stop mechanisms. Kopern ships with built-in tool approval policies, session event logs, and a compliance report generator to cover Article 14 (human oversight) out of the box.",
  },
  {
    question: "Which LLM models can you use to build AI agents?",
    answer:
      "The major providers are Anthropic (Claude Opus, Sonnet, Haiku), OpenAI (GPT-4o, o1), Google (Gemini 2.5 Flash, Pro), Mistral (Large, Codestral, Nemo), and local open-source via Ollama. Kopern lets you switch models per agent and A/B test them via Tournament mode to pick the best quality-cost tradeoff.",
  },
  {
    question: "Is Kopern free to use?",
    answer:
      "Yes. Kopern's free Starter tier includes 3 agents and 100K tokens/month with grading and MCP access. Pro ($79/mo) adds teams, connectors, and 2M tokens. Pay-as-you-go is available for unlimited scale. All plans include deterministic grading, multi-agent orchestration, and deployment to Slack, webhooks, and widgets.",
  },
  {
    question: "What is multi-agent orchestration?",
    answer:
      "Multi-agent orchestration means multiple specialized AI agents work together on one task. Kopern supports parallel execution (all agents run at once), sequential pipelines (output flows between agents), and conditional routing (input decides which agent runs). Useful for research teams, content pipelines, and triage workflows where one agent is not enough.",
  },
];

export function FAQJsonLd({ faqs }: { faqs?: FAQItem[] } = {}) {
  const items = faqs ?? DEFAULT_FAQS;
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((faq) => ({
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

export function ArticleJsonLd({
  title,
  description,
  image,
  author,
  authorGithub,
  datePublished,
  dateModified,
  url,
  wordCount,
  locale,
}: {
  title: string;
  description: string;
  image: string;
  author: string;
  authorGithub?: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  wordCount?: number;
  locale: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: title,
    description,
    image: {
      "@type": "ImageObject",
      url: image.startsWith("http") ? image : `${SITE_URL}${image}`,
      width: 1200,
      height: 630,
    },
    author: {
      "@type": "Person",
      name: author,
      ...(authorGithub && {
        sameAs: [`https://github.com/${authorGithub}`],
      }),
      worksFor: {
        "@type": "Organization",
        name: "Kopern",
        url: SITE_URL,
      },
    },
    publisher: {
      "@type": "Organization",
      name: "Kopern",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/logo_small.png`,
        width: 512,
        height: 512,
      },
    },
    datePublished,
    ...(dateModified && { dateModified }),
    inLanguage: locale,
    ...(wordCount && { wordCount }),
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".article-summary", "[data-speakable]"],
    },
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

export function WebSiteJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Kopern",
    url: SITE_URL,
    description:
      "Build, test, grade, and deploy production-grade AI agents without code.",
    inLanguage: ["en", "fr"],
    publisher: {
      "@type": "Organization",
      name: "Kopern",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function PricingJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Kopern AI Agent Builder",
    description: "Build, test, deploy, and connect production-grade AI agents",
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    image: [
      `${SITE_URL}/opengraph-image`,
      `${SITE_URL}/logo_small.png`,
    ],
    offers: [
      {
        "@type": "Offer",
        name: "Starter",
        price: "0",
        priceCurrency: "USD",
        description: "Free — 3 agents, 100K tokens/month, basic features",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/en/pricing`,
      },
      {
        "@type": "Offer",
        name: "Pro",
        price: "79.00",
        priceCurrency: "USD",
        description: "25 agents, 2M tokens, grading, teams, 3 connectors",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/en/pricing`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "79.00",
          priceCurrency: "USD",
          billingDuration: "P1M",
        },
      },
      {
        "@type": "Offer",
        name: "Usage",
        price: "0",
        priceCurrency: "USD",
        description: "Pay per token — unlimited agents and features",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/en/pricing`,
      },
      {
        "@type": "Offer",
        name: "Enterprise",
        price: "499.00",
        priceCurrency: "USD",
        description: "Unlimited everything, priority support",
        availability: "https://schema.org/InStock",
        url: `${SITE_URL}/en/pricing`,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: "499.00",
          priceCurrency: "USD",
          billingDuration: "P1M",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
