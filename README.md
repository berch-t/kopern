<p align="center">
  <img src="public/logo_small.png" alt="Kopern" width="180" />
</p>


<p align="center">
  <strong>The open-source platform to build, grade, and deploy AI agents — no code required.</strong>
</p>

<p align="center">
  <a href="https://kopern.ai"><img src="https://img.shields.io/badge/demo-kopern.ai-0284c7?style=for-the-badge" alt="Live Demo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16" /></a>
</p>

<p align="center">
  <a href="#features">Features</a> &middot;
  <a href="#quick-start">Quick Start</a> &middot;
  <a href="#why-kopern">Why Kopern</a> &middot;
  <a href="#architecture">Architecture</a> &middot;
  <a href="#mcp-integration">MCP</a> &middot;
  <a href="#contributing">Contributing</a>
</p>

---

<!-- Replace with a real GIF/video of your demo -->
<p align="center">
  <img src="docs/assets/demo.gif" alt="Kopern Demo — Create an agent in 30 seconds" width="720" />
</p>

> **Describe your agent in plain text. Kopern builds it, tests it, optimizes it, and deploys it — in under a minute.**

---

## Why Kopern?

Most AI agent tools are **frameworks** — they give you building blocks and wish you luck. Kopern is a **platform**: build, test, deploy, and monitor in one place.

| | Kopern | LangChain / CrewAI | AutoGen | Dify |
|---|---|---|---|---|
| No-code agent builder | Yes | No | No | Partial |
| Deterministic grading (6 criteria) | Yes | No | No | No |
| Self-improving optimization lab | Yes (6 modes) | No | No | No |
| One-click deploy (Widget, Slack, Telegram, WhatsApp, Webhooks) | Yes | No | No | Partial |
| MCP server (Claude Code, Cursor) | Yes | No | No | No |
| Built-in Stripe billing | Yes | No | No | No |
| Multi-provider LLM (Anthropic, OpenAI, Google, Ollama) | Yes | Yes | Yes | Yes |
| EU AI Act compliance tools | Yes | No | No | No |
| Agent memory + context compaction | Yes | Partial | No | Partial |
| Email + Calendar tools (OAuth) | Yes | No | No | No |

**Kopern is what you'd build if you started from the problem** — "How do I ship a production AI agent today?" — **instead of the technology.**

---

## Features

### Agent Builder
- **AI Agent Wizard** — Describe your agent in plain text, get a fully configured agent (system prompt, skills, tools, extensions, grading suite) generated as structured JSON
- **Visual Configuration** — System prompts, markdown skills, custom tools (sandboxed JS), TypeScript extensions, branding
- **Multi-Model** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), Ollama (local) via unified streaming
- **Extended Thinking** — 6 levels (off, minimal, low, medium, high, xhigh)
- **Agent Memory** — Persistent key-value memory across sessions, auto-injected in context, LRU eviction
- **Context Compaction** — Automatic summarization of old messages when context window fills up

### Grading and Optimization Lab
- **Deterministic Grading** — 6 criteria: output match, schema validation, tool usage, safety check, custom script, LLM judge
- **AutoTune** — Iterative prompt refinement via hill-climbing
- **AutoFix** — One-click diagnosis and patch for failed test cases (self-sufficient: generates its own test suite if needed)
- **Stress Lab** — Automated red team: prompt injection, jailbreaks, hallucination traps, with auto-hardening
- **Tournament** — A/B model arena to find the best config
- **Distillation** — Same quality, fraction of the cost
- **Evolution** — Parallel search across prompt x model x config space

### Deploy Everywhere
- **Embeddable Widget** — Drop-in `<script>` tag for any website (Shadow DOM, SSE, markdown, mobile-responsive)
- **Slack Bot** — OAuth install, @mention/DM, thread context
- **Telegram Bot** — Webhook-based, async processing
- **WhatsApp** — Cloud API (Meta Business)
- **Webhooks** — Inbound (sync JSON, HMAC) + Outbound with anti-loop protection
- **MCP Protocol** — Real Streamable HTTP server for Claude Code, Cursor, and any MCP client
- **n8n / Zapier / Make** — Native integration via HTTP Request nodes

### Service Connectors
- **Email** (Gmail + Outlook) — Read, send, reply via OAuth
- **Calendar** (Google + Microsoft) — List events, check availability, create/update/cancel
- **Encrypted tokens** — AES-256-GCM, daily limits, destructive action approval

### Orchestration
- **Agent Teams** — Parallel, sequential, or conditional multi-agent execution
- **Pipelines** — Multi-step workflows with input mapping and per-step tool calling
- **Sub-agent Delegation** — Agents delegate subtasks to specialized sub-agents

### Operator Dashboard
- **KPI Cards** — Messages, resolution rate, satisfaction, cost at a glance
- **One-click AutoFix** — Improve your agent with zero technical knowledge
- **Simplified Edit Form** — Re-answer onboarding questions to update agent behavior
- **Memory Panel** — View, add, delete agent memories
- **Connector Status** — See which channels are active

### Billing and Security
- **Stripe Billing** — Subscriptions + usage-based meters, customer portal
- **Plan Enforcement** — Token, agent, grading, team, pipeline, MCP limits
- **Rate Limiting** — 8 Upstash Redis sliding window limiters
- **Input Validation** — Zod v4 schemas on all API routes
- **Tool Approval** — EU AI Act Art. 14 human oversight for destructive actions
- **CSP Headers** — Content Security Policy on all routes

### Platform
- **Internationalization** — Full English/French (800+ keys each)
- **Dark Mode** — OKLch color system
- **Mobile Responsive** — Sheet drawer sidebar
- **Session Tracking** — Conversation timelines, JSON export
- **Version Control** — Snapshot agents, track grading per version
- **Bug Fixer Agent** — Autonomous dev agent: reads codebase, creates PR, sends thank-you email
- **EU AI Act Compliance** — Automated compliance reports (Art. 6, 12, 14, 52)

---

## Quick Start

### Prerequisites

- Node.js >= 20
- A Firebase project (Firestore + Auth)
- At least one LLM API key (Anthropic, OpenAI, or Google)

### Install

```bash
git clone https://github.com/berch-t/kopern.git
cd kopern
npm install
cp .env.example .env.local   # Edit with your keys
npm run dev                   # http://localhost:3000
```

### Environment Variables

<details>
<summary>Click to expand full .env.local template</summary>

```env
# Firebase Client (public)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin (server-side only)
FIREBASE_PROJECT_ID=your-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Stripe (optional — billing features)
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# LLM API Keys (add the ones you need)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
OLLAMA_BASE_URL=http://localhost:11434

# Admin (optional)
NEXT_PUBLIC_ADMIN_UID=your-firebase-uid

# Service Connectors — OAuth (optional)
GOOGLE_OAUTH_CLIENT_ID=...
GOOGLE_OAUTH_CLIENT_SECRET=...
MICROSOFT_OAUTH_CLIENT_ID=...
MICROSOFT_OAUTH_CLIENT_SECRET=...
ENCRYPTION_KEY=...  # 64-char hex: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Slack Bot (optional)
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_SIGNING_SECRET=...

# Rate Limiting (optional)
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

</details>

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4 |
| Animation | Framer Motion 12 |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Authentication |
| Billing | Stripe (subscriptions + usage meters) |
| LLM | Multi-provider streaming (Anthropic, OpenAI, Google, Ollama) |
| Rate Limiting | Upstash Redis |
| Validation | Zod v4 |

---

## Architecture

```
                    +------------------+
                    |   Next.js App    |
                    |   (App Router)   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
        +-----+----+  +-----+----+  +------+-----+
        | Dashboard |  |   API    |  |  Landing   |
        | (auth)    |  |  Routes  |  |  (public)  |
        +-----------+  +----+-----+  +------------+
                            |
         +------------------+------------------+
         |          |          |          |
    +----+---+ +---+----+ +---+----+ +---+----+
    |  Chat  | | Grading| |  MCP   | |Connectors|
    |  SSE   | |  Lab   | | Server | | (5 ch.) |
    +----+---+ +---+----+ +---+----+ +---+-----+
         |         |           |          |
    +----+---------+-----------+----------+----+
    |        runAgentWithTools()                |
    |   (shared agentic loop — all routes)     |
    +----+------------+------------+-----------+
         |            |            |
    +----+---+  +-----+----+ +----+-----+
    | streamLLM| | Firebase  | |  Stripe  |
    | (multi-  | | Admin SDK | |  Billing |
    | provider)| | Firestore | |  Meters  |
    +----------+ +----------+ +----------+
```

### Firestore Schema

```
users/{userId}
  /agents/{agentId}
    /skills, /tools, /extensions, /versions
    /memory/{key}                    # Agent memory (LRU eviction)
    /gradingSuites/{suiteId}/cases, /runs/{runId}/results
    /autoresearchRuns/{runId}/iterations
    /pipelines, /sessions
    /connectors/widget, /connectors/slackConnection
    /webhooks/{webhookId}, /webhookLogs/{logId}
  /serviceConnectors/{provider}     # Encrypted OAuth tokens
  /agentTeams/{teamId}
  /usage/{yearMonth}
  /bugs/{bugId}
apiKeys/{sha256Hash}                # MCP API keys (admin SDK)
```

### API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/agents/[id]/chat` | SSE streaming chat with tool calling |
| `POST /api/agents/[id]/grading/[suite]/run` | Grading runner |
| `POST /api/agents/[id]/autoresearch/*` | 6 optimization modes |
| `POST /api/agents/meta-create` | AI agent creation (JSON output) |
| `POST /api/mcp/server` | MCP Streamable HTTP protocol |
| `POST /api/widget/chat` | Embeddable widget SSE |
| `POST /api/webhook/[id]` | Inbound webhooks |
| `POST /api/slack/events` | Slack Events API |
| `POST /api/telegram/webhook` | Telegram bot |
| `POST /api/whatsapp/webhook` | WhatsApp Cloud API |
| `POST /api/teams/[id]/execute` | Team execution SSE |
| `GET /api/oauth/google\|microsoft` | Service connector OAuth |

<details>
<summary>Full route list (25+ routes)</summary>

- `POST /api/agents/[id]/pipelines/[pid]/execute` — Pipeline execution
- `POST /api/agents/[id]/approve` — Tool approval decision
- `POST/PUT/DELETE /api/mcp/keys` — API key management
- `POST /api/mcp` — Legacy JSON-RPC endpoint
- `POST /api/stripe/checkout` — Stripe Checkout session
- `POST /api/stripe/webhook` — Stripe webhook (9 events)
- `GET /api/stripe/subscription` — Current subscription
- `POST /api/stripe/portal` — Customer Portal redirect
- `GET/POST /api/github/content` — Repo tree + file content
- `GET /api/github/repos` — List user repos
- `POST /api/bug-report` — Bug report submission
- `GET /api/widget/config` — Widget config JSON
- `GET /api/widget/script` — Widget JS bundle
- `GET /api/slack/install` — Slack OAuth URL
- `GET /api/slack/oauth` — Slack OAuth callback
- `POST /api/telegram/setup` — Telegram bot setup
- `POST /api/whatsapp/setup` — WhatsApp phone setup
- `POST /api/oauth/disconnect` — Revoke service connector
- `GET /api/agents/[id]/compliance-report` — EU AI Act report
- `GET /api/health` — Liveness check

</details>

---

## MCP Integration

Kopern agents work as MCP servers for Claude Code, Cursor, and any MCP client.

### Setup

1. Create an agent in Kopern
2. Go to **MCP Servers** > **New Server** — copy the API key
3. Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "my-kopern-agent": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_your_api_key_here"
      }
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `kopern_chat` | Send a message to the agent (with optional conversation history) |
| `kopern_agent_info` | Get agent metadata (name, description, model, config) |

---

## Plan Limits

| | Starter (Free) | Pro ($79/mo) | Usage (PAYG) | Enterprise ($499/mo) |
|---|---|---|---|---|
| Agents | 2 | 25 | Unlimited | Unlimited |
| Tokens/month | 10K | 1M | Pay per use | 10M |
| MCP Endpoints | 1 | 10 | Unlimited | Unlimited |
| Grading runs | 5/mo | 100/mo | $0.10/run | Unlimited |
| Models | Sonnet + Haiku | All | All | All + fine-tuned |
| Connectors | 0 | 3 | Unlimited | Unlimited |
| Optimization Lab | -- | 6 modes | 6 modes | 6 modes + priority |
| Teams | 0 | 5 | Unlimited | Unlimited |

---

## Deployment

### Vercel (Recommended)

```bash
# 1. Push to GitHub
# 2. Import in Vercel
# 3. Add env vars in Vercel dashboard
# 4. Deploy
```

### Stripe Setup

1. Create products/prices in Stripe Dashboard
2. Create Billing Meters for usage tracking
3. Configure webhook: `https://your-domain.com/api/stripe/webhook`
4. Register events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

---

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues:**
- New agent templates for the Examples gallery
- Translations beyond EN/FR
- New LLM provider support
- Pre-built tool integrations (Notion, Linear, Discord...)
- Documentation and tutorials

### Development

```bash
npm install       # Install dependencies
npm run dev       # Dev server on :3000
npm run build     # Production build
npm run lint      # ESLint
npx tsc --noEmit  # Type check
```

---

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

## Roadmap

- [x] Agent Builder + Playground
- [x] Grading Engine (6 criteria)
- [x] Optimization Lab (6 modes)
- [x] 5 Connectors (Widget, Slack, Telegram, WhatsApp, Webhooks)
- [x] MCP Protocol (Streamable HTTP)
- [x] Agent Memory + Context Compaction
- [x] Service Connectors (Gmail, Outlook, Google Calendar, Microsoft Calendar)
- [x] Operator Dashboard (no-code agent management)
- [x] EU AI Act Compliance Tools
- [ ] Agent Teams with Visual Orchestration (React Flow)
- [ ] Docker Sandbox for custom tools
- [ ] Template Marketplace
- [ ] Connector Plugin SDK
- [ ] Customer Discovery (Grenoble/Rhone-Alpes)

---

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

<p align="center">
  <sub>Built with coffee and ambition in Grenoble, France.</sub>
</p>
