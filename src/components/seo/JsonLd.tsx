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

export function FAQJsonLd() {
  const faqs = [
    {
      question: "What is Kopern?",
      answer:
        "Kopern is an AI agent builder platform that lets you create, test, and deploy production-grade AI agents. You can configure custom tools with sandboxed execution, connect GitHub repos, build multi-agent teams, validate with deterministic grading pipelines, and deploy agents via embeddable widgets, webhooks, Slack bots, and MCP endpoints.",
    },
    {
      question: "Which AI models does Kopern support?",
      answer:
        "Kopern supports Anthropic Claude (Opus 4.6, Sonnet 4.6, Haiku 4.5), OpenAI GPT (GPT-4o, GPT-4o-mini), Google Gemini (2.5 Flash), Mistral AI (Mistral Large, Codestral, Nemo), and local models via Ollama. Each agent can be configured with a different model, temperature, and thinking level.",
    },
    {
      question: "What is agent grading?",
      answer:
        "Agent grading lets you create test suites with specific criteria to automatically validate your agent's behavior. Kopern supports 6 criterion types: output match, schema validation, tool usage, safety checks, custom scripts, and LLM-as-judge evaluation. Results are persisted for tracking improvement over time.",
    },
    {
      question: "How do I deploy an agent on my website?",
      answer:
        "Use the embeddable chat widget. Add a single <script> tag to your website with your API key. The widget renders in a Shadow DOM for CSS isolation, streams responses via SSE, supports markdown, and is mobile-responsive. Configure welcome message, position, and allowed origins from the dashboard.",
    },
    {
      question: "Can I connect my agent to Slack?",
      answer:
        "Yes. Install the Slack bot from the Connectors dashboard using OAuth. Once connected, your agent responds to @mentions and direct messages in Slack. It supports threaded conversations and adds reaction checkmarks to processed messages.",
    },
    {
      question: "What are webhooks used for?",
      answer:
        "Inbound webhooks let external services (n8n, Zapier, Make, custom apps) send messages to your agent via REST API and get JSON responses. Outbound webhooks fire when your agent completes actions (message sent, tool called, session ended), letting you trigger downstream workflows. HMAC-SHA256 signing is supported for security.",
    },
    {
      question: "Can I connect my own GitHub repositories?",
      answer:
        "Yes. Connect your GitHub repos via OAuth and your agents get built-in read_file, search_files, and github_write tools, plus the repo tree and README injected into context. Agents can read, search, and write to your codebase during conversations.",
    },
    {
      question: "What is MCP (Model Context Protocol)?",
      answer:
        "MCP is an open standard for connecting AI agents to external tools and data sources. Kopern lets you expose any agent as an MCP server with API key authentication, compatible with Claude Code, Cursor, and any MCP client. Other applications can send messages to your agent via the standardized protocol.",
    },
    {
      question: "What is AutoResearch?",
      answer:
        "AutoResearch is Kopern's optimization lab with 6 modes: AutoTune (auto-optimize prompts), AutoFix (diagnose failing tests), Stress Lab (adversarial testing), Tournament (prompt comparison), Distillation (transfer to cheaper models), and Evolution (genetic prompt optimization). It automatically improves your agent's performance.",
    },
    {
      question: "How does multi-agent orchestration work?",
      answer:
        "Kopern supports agent teams with three execution modes: parallel (all agents run simultaneously), sequential (agents run one after another with shared context), and conditional (routing based on input rules). Each agent in a team keeps its own tools, skills, and configuration. Pipelines chain agents sequentially with input/output mapping.",
    },
    {
      question: "Is Kopern free to use?",
      answer:
        "Kopern offers a free Starter tier with 3 agents and 100K tokens per month. Pro ($79/mo) adds grading, teams, and connectors. Usage-based billing is available for pay-per-token needs. Enterprise ($499/mo) provides unlimited everything with priority support.",
    },
    {
      question: "What languages does Kopern support?",
      answer:
        "The Kopern interface is available in English and French. Agents themselves can be configured to respond in any language supported by the underlying LLM model.",
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
    "@type": "Product",
    name: "Kopern AI Agent Builder",
    description: "Build, test, deploy, and connect production-grade AI agents",
    image: [
      `${SITE_URL}/opengraph-image`,
      `${SITE_URL}/logo_small.png`,
    ],
    brand: {
      "@type": "Brand",
      name: "Kopern",
    },
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
