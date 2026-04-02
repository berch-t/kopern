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
| Visual team orchestration (React Flow) | Yes | No | No | No |
| Code execution (Python/Node/Bash) | Yes | No | No | Partial |
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
- **Zero-Code Onboarding** — Template gallery (28 general + 9 vertical business templates) with guided questionnaire and 1-click deploy
- **Visual Configuration** — System prompts, markdown skills, custom tools (sandboxed JS), TypeScript extensions, branding (custom icons + colors)
- **Multi-Model** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), Ollama (local) via unified streaming with key rotation failover (up to 5 keys/provider)
- **Extended Thinking** — 6 levels (off, minimal, low, medium, high, xhigh)
- **Agent Memory** — Persistent key-value memory across sessions, auto-injected in context, LRU eviction, cross-session search
- **Context Compaction** — Automatic Haiku-based summarization of old messages when context window fills up

### Built-in Agent Tools
- **web_fetch** — Server-side HTTP fetch (GET/POST/PUT/DELETE), HTML-to-text extraction, anti-loop protection
- **code_interpreter** — Python, Node.js, and Bash execution via GCP Cloud Run (numpy, pandas, matplotlib pre-installed, auto-scale 0-10, 300s timeout)
- **Agent Memory** — `remember`, `recall`, `forget`, `search_sessions` tools
- **Email** (Gmail + Outlook) — `read_emails`, `send_email`, `reply_email` via OAuth
- **Calendar** (Google + Microsoft) — `list_events`, `check_availability`, `create_event`, `update_event`, `cancel_event`
- **GitHub** — `read_file`, `search_files`, `create_branch`, `commit_files`, `create_pull_request`
- **Bug Management** — `list_bugs`, `get_bug`, `update_bug_status`, `send_thank_you_email` (admin-only)

### Grading and Optimization Lab
- **Deterministic Grading** — 6 criteria: output match, schema validation, tool usage, safety check, custom script, LLM judge
- **Scheduled Grading** — Vercel Cron with configurable schedule, score drop and threshold alerts via email/Slack/webhook
- **AutoTune** — Iterative prompt refinement via hill-climbing
- **AutoFix** — One-click diagnosis and patch for failed test cases (self-sufficient: generates its own test suite if needed)
- **Stress Lab** — Automated red team: prompt injection, jailbreaks, hallucination traps, with auto-hardening
- **Tournament** — A/B model arena to find the best config
- **Distillation** — Same quality, fraction of the cost
- **Evolution** — Parallel search across prompt x model x config space

### Deploy Everywhere
- **Embeddable Widget** — Drop-in `<script>` tag for any website (Shadow DOM, SSE, markdown, mobile-responsive)
- **Slack Bot** — OAuth install, @mention/DM, thread context, conversational tool approval
- **Telegram Bot** — Webhook-based, async processing, conversational tool approval
- **WhatsApp** — Cloud API (Meta Business), conversational tool approval
- **Webhooks** — Inbound (sync JSON, HMAC) + Outbound with anti-loop protection
- **MCP Protocol** — Real Streamable HTTP server for Claude Code, Cursor, and any MCP client
- **n8n / Zapier / Make** — Native integration via HTTP Request nodes

### Visual Orchestration (React Flow)
- **Flow Editor** — Drag-and-drop node editor with 5 node types: Agent, Condition, Trigger, Output, Export
- **Node Configuration** — Double-click to edit any node; full agent config editing without leaving the page
- **Agent Branding** — Custom icons and colors visible on team flow nodes
- **Export Node** — Choose output format (JSON, CSV, Markdown, PDF) with auto-download
- **Runtime Status** — Live node status updates during team execution
- **Auto-layout** — Automatic parallel/sequential/conditional layout
- **Activity Timeline** — 8-action audit trail for team operations
- **Kanban Board** — 6-column drag-drop task management
- **Goal Tree** — Collapsible goal hierarchy with progress bars
- **Org Chart** — SVG organizational chart with Buchheim-Walker layout
- **Routine Scheduler** — CRON-based recurring team tasks
- **Budget Enforcer** — Team spend tracking and budget limits
- **Pipelines** — Multi-step workflows with input mapping and per-step tool calling
- **Sub-agent Delegation** — Coordinator agents delegate subtasks to specialists

### Operator Dashboard
- **KPI Cards** — Messages, resolution rate, satisfaction, cost at a glance
- **One-click AutoFix** — Improve your agent with zero technical knowledge
- **Simplified Edit Form** — Re-answer onboarding questions to update agent behavior
- **Memory Panel** — View, add, delete agent memories with usage indicator
- **Connector Status** — See which channels are active with dedicated config pages
- **Service Connector Panel** — Connect/disconnect Google and Microsoft OAuth

### Billing and Security
- **Stripe Billing** — Subscriptions + usage-based meters, customer portal
- **Plan Enforcement** — Token, agent, grading, team, pipeline, MCP limits
- **Rate Limiting** — 8 Upstash Redis sliding window limiters
- **Input Validation** — Zod v4 schemas on all API routes
- **Tool Approval** — EU AI Act Art. 14 human oversight for destructive actions (interactive SSE + conversational on messaging channels)
- **Encrypted OAuth Tokens** — AES-256-GCM, daily limits (20 emails/day, 10 events/day per agent)
- **CSP Headers** — Content Security Policy on all routes

### Platform
- **Internationalization** — Full English/French (800+ keys each)
- **Dark Mode** — OKLch color system
- **Mobile Responsive** — Sheet drawer sidebar
- **Session Tracking** — Conversation timelines, JSON export
- **Version Control** — Snapshot agents, track grading per version, auto-increment on prompt change
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
| Visual Editor | React Flow v12 |
| Database | Cloud Firestore (real-time) |
| Auth | Firebase Authentication (Google/GitHub/Email) |
| Billing | Stripe (subscriptions + usage meters) |
| LLM | Multi-provider streaming (Anthropic, OpenAI, Google, Ollama) |
| Code Execution | GCP Cloud Run (Python/Node/Bash sandbox) |
| Rate Limiting | Upstash Redis |
| Validation | Zod v4 |
| Encryption | AES-256-GCM (OAuth tokens) |

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
       +--------------------+--------------------+
       |         |          |          |          |
  +----+---+ +--+-----+ +--+----+ +--+------+ +-+------+
  |  Chat  | |Grading | |  MCP  | |Connectors| | Teams  |
  |  SSE   | |  Lab   | |Server | | (5 ch.)  | | (Flow) |
  +----+---+ +--+-----+ +--+----+ +--+-------+ +--+----+
       |        |           |         |             |
  +----+--------+-----------+---------+-------------+--+
  |           runAgentWithTools()                       |
  |     (shared agentic loop — all routes)             |
  +----+----------+----------+----------+--------------+
       |          |          |          |
  +----+---+ +---+-----+ +-+------+ +-+----------+
  |streamLLM| |Firebase | |Stripe  | |GCP Cloud   |
  |(multi-  | |Admin SDK| |Billing | |Run (code   |
  |provider)| |Firestore| |Meters  | |interpreter)|
  +---------+ +---------+ +--------+ +------------+
```

### Firestore Schema

```
users/{userId}
  /agents/{agentId}
    /skills, /tools, /extensions, /versions
    /memory/{key}                    # Agent memory (LRU eviction, keyword search)
    /gradingSuites/{suiteId}/cases, /runs/{runId}/results
    /autoresearchRuns/{runId}/iterations
    /pipelines/{pipelineId}, /sessions/{sessionId}
    /connectors/widget, /connectors/slackConnection
    /webhooks/{webhookId}, /webhookLogs/{logId}
    /mcpServers/{serverId}/usage/{yearMonth}
  /serviceConnectors/{provider}     # Encrypted OAuth tokens (AES-256-GCM)
  /agentTeams/{teamId}
    /activity/{activityId}          # 8-action audit trail
    /tasks/{taskId}                 # Kanban task board
    /routines/{routineId}           # CRON scheduled routines
  /goals/{goalId}
  /usage/{yearMonth}               # Token + cost tracking with agent breakdown
  /bugs/{bugId}
apiKeys/{sha256Hash}                # MCP API keys (O(1) lookup)
slackTeams/{teamId}                 # Slack workspace index
telegramBots/{hash}                 # Telegram bot routing
whatsappPhones/{phoneId}            # WhatsApp phone routing
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
| `GET /api/cron/grading` | Scheduled grading + alerts (Vercel Cron) |
| `GET /api/cron/routines` | Scheduled team routines (Vercel Cron) |

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

Kopern exposes its **entire platform** as an MCP server — 32 tools for the full agent lifecycle, from creation to deployment to monitoring. Works with Claude Code, Cursor, Windsurf, and any MCP client.

### Setup

**Option A — Platform key** (recommended for most use cases):
1. Sign up on kopern.ai
2. Go to **Settings** > **Personal API Key** — generate a key
3. Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "kopern": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_your_api_key_here"
      }
    }
  }
}
```

**Option B — Agent-bound key** (for chat + agent-specific tools):
1. Create an agent in Kopern
2. Go to **MCP/API** tab > generate an API key
3. Same `.mcp.json` format — this key unlocks `kopern_chat` and `kopern_agent_info` in addition to all platform tools.

### Available MCP Tools (32)

#### Agent-Bound Only (require agent key)
| Tool | Description |
|------|-------------|
| `kopern_chat` | Send a message to the agent with tool calling |
| `kopern_agent_info` | Get agent metadata |

#### Agent CRUD
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_create_agent` | Create agent with system prompt, skills, tools | Free |
| `kopern_get_agent` | Full agent details + subcollection counts | Free |
| `kopern_update_agent` | Update prompt, model, tools, config | Free |
| `kopern_delete_agent` | Permanent delete with cascade | Free |
| `kopern_list_agents` | List all agents with scores | Free |

#### Templates
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_list_templates` | Browse 37 templates (28 general + 9 vertical) | Free |
| `kopern_deploy_template` | 1-click deploy with onboarding variables | Free |

#### Grading & Optimization
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_grade_prompt` | Grade a system prompt inline (no agent needed) | Your keys |
| `kopern_create_grading_suite` | Define test cases on an agent | Free |
| `kopern_run_grading` | Run all test cases, get detailed scores | Your keys |
| `kopern_run_autoresearch` | AutoTune iterative optimization | Your keys |
| `kopern_get_grading_results` | Detailed results of a grading run | Free |
| `kopern_list_grading_runs` | Score history over time | Free |

#### Teams & Pipelines
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_create_team` | Multi-agent team (parallel/sequential/conditional) | Free |
| `kopern_run_team` | Execute team on a prompt | Your keys |
| `kopern_create_pipeline` | Multi-step pipeline with input mapping | Free |
| `kopern_run_pipeline` | Execute pipeline sequentially | Your keys |

#### Connectors
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_connect_widget` | Embeddable chat widget + embed code | Free |
| `kopern_connect_telegram` | Telegram bot via @BotFather | Free |
| `kopern_connect_whatsapp` | WhatsApp Business via Meta Cloud API | Free |
| `kopern_connect_slack` | Slack OAuth install URL | Free |
| `kopern_connect_webhook` | Inbound/outbound webhooks (n8n, Zapier, Make) | Free |
| `kopern_connect_email` | Gmail/Outlook OAuth + email tools | Free |
| `kopern_connect_calendar` | Google/Microsoft Calendar + scheduling tools | Free |

#### Monitoring & Data
| Tool | Description | LLM Cost |
|------|-------------|----------|
| `kopern_list_sessions` | Conversation history with metrics | Free |
| `kopern_get_session` | Full session detail (events, tool calls) | Free |
| `kopern_manage_memory` | Agent memory CRUD (remember/recall/forget/list) | Free |
| `kopern_compliance_report` | EU AI Act compliance report (Art. 6/12/14/52) | Free |
| `kopern_get_usage` | Token usage, cost, per-agent breakdown | Free |
| `kopern_export_agent` | Export agent as portable JSON | Free |
| `kopern_import_agent` | Import agent from Kopern export JSON | Free |

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

### Vercel (Recommended for SaaS)

```bash
# 1. Push to GitHub
# 2. Import in Vercel
# 3. Add env vars in Vercel dashboard
# 4. Deploy
```

### Self-Hosted (Docker)

Run Kopern on your own infrastructure. Ideal for enterprises with data sovereignty requirements or teams wanting full local operation with Ollama.

```bash
git clone https://github.com/berch-t/kopern.git
cd kopern
cp .env.example .env.local
# Edit .env.local with your Firebase + LLM keys
docker compose up -d
# Open http://localhost:3000
```

**Full local mode** (no cloud dependencies):
1. Uncomment the `firebase-emulator` service in `docker-compose.yml`
2. Uncomment the `ollama` service for local LLMs
3. Set `FIRESTORE_EMULATOR_HOST=firebase-emulator:8080` in `.env.local`
4. Set `OLLAMA_BASE_URL=http://ollama:11434` in `.env.local`
5. No Stripe keys needed — billing features are disabled without them

**Enterprise LLM support**:
- **Ollama** — already supported, full local, zero API calls
- **Azure OpenAI** — use `azure-openai` provider with your deployment endpoint
- **Any OpenAI-compatible endpoint** — use `openai` provider with custom `OPENAI_BASE_URL` for vLLM, TGI, or internal LLMs

### Stripe Setup

1. Create products/prices in Stripe Dashboard
2. Create Billing Meters for usage tracking
3. Configure webhook: `https://your-domain.com/api/stripe/webhook`
4. Register events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

---

## Contributing

We welcome contributions of all kinds. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

**Good first issues:**
- New vertical templates for specific industries
- Translations beyond EN/FR
- New LLM provider support
- Pre-built tool integrations (Notion, Linear, Discord...)
- Custom connector plugins (when Plugin SDK ships)
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
- [x] MCP Protocol — 32 tools (Streamable HTTP, Vague 1 + 2)
- [x] Agent Memory + Context Compaction
- [x] Service Connectors (Gmail, Outlook, Google Calendar, Microsoft Calendar)
- [x] Operator Dashboard (no-code agent management)
- [x] EU AI Act Compliance Tools
- [x] Zero-Code Onboarding + 37 Templates (28 general + 9 vertical)
- [x] Code Interpreter (Python/Node/Bash via GCP Cloud Run)
- [x] web_fetch builtin (server-side HTTP fetch)
- [x] Agent Teams + Visual Orchestration (React Flow v12)
- [x] Conversational Tool Approval (Telegram/WhatsApp/Slack)
- [x] Scheduled Grading + Alerts (Vercel Cron)
- [x] Self-Hosted Docker deployment (docker-compose + Ollama)
- [x] Agent Export/Import (portable JSON)
- [ ] Template Marketplace
- [ ] Connector Plugin SDK
- [ ] TypeScript SDK
- [ ] Customer Discovery (Grenoble/Rhone-Alpes)
- [ ] Concierge Pilots + First Paying Customers

---

## License

[MIT](LICENSE) — use it, fork it, build on it.

---

<p align="center">
  <sub>Built with coffee and ambition in Grenoble, France.</sub>
</p>
