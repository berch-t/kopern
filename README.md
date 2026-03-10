# Kopern

**AI Agent Builder, Orchestrator & Grader** — Create custom business AI agents, validate them through deterministic grading, orchestrate multi-agent teams, and expose them as API endpoints. With Stripe billing, GitHub integration, and real-time observability.

Built with Next.js 16, Firebase, Stripe, and a multi-provider LLM streaming engine.

---

## Features

- **Agent Builder** — Configure agents with system prompts, skills, custom tools, and extensions
- **Multi-Model** — Anthropic, OpenAI, Google Gemini, Ollama (local) via a unified streaming interface
- **Extended Thinking** — 6 levels (off, minimal, low, medium, high, xhigh) for supported providers
- **Deterministic Grading** — 6 criterion types: output match, schema validation, tool usage, safety check, custom script, LLM judge. Results persisted to Firestore with per-case metrics
- **Agent Teams** — Orchestrate multiple agents (parallel/sequential/conditional) with real SSE execution
- **Pipelines** — Multi-step workflows with input mapping and per-step tool calling
- **Playground** — Live chat with SSE streaming, markdown rendering, tool call visualization, live metrics
- **MCP Servers** — Expose agents as JSON-RPC API endpoints with API key auth, rate limiting, and per-token usage tracking
- **GitHub Integration** — Connect repositories via OAuth. Agents read files, search code, and get repo context injected automatically
- **Stripe Billing** — Subscriptions (Pro/Enterprise), usage-based billing via Billing Meters, webhooks (9 events), customer portal, plan limit enforcement on all routes
- **Sessions & Observability** — Server-side session tracking, full conversation timelines, JSON export
- **Extensions** — 25+ event hooks with blocking support, wired into the agentic loop
- **Meta-Agent Wizard** — AI-powered agent creation with SSE streaming (works for unauthenticated visitors too)
- **Internationalization** — Full English/French support with `[locale]` route segments, middleware locale detection, and JSON dictionaries
- **Pricing Page** — 4 tiers (Starter free, Pro $79/mo, Usage pay-as-you-go, Enterprise $499/mo)
- **Examples Gallery** — 15+ production-ready agent templates with "Use this Agent" one-click deployment
- **Documentation** — In-app docs with MCP integration tutorial, TOC, save as markdown/skill
- **Version Control** — Snapshot agents, track grading history per version
- **Authentication** — Firebase Auth (Google, GitHub with `repo` scope + credential linking, Email/Password)
- **Mobile Responsive** — Sheet drawer sidebar on mobile, collapsible sidebar on desktop
- **Dark Mode** — Full theme support with OKLch color system

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict mode) |
| UI | shadcn/ui + Radix UI + Tailwind CSS 4 |
| Animation | Framer Motion 12 |
| Code Editor | Monaco Editor |
| Database | Cloud Firestore (real-time subscriptions) |
| Auth | Firebase Authentication |
| Server SDK | Firebase Admin (API routes) |
| Billing | Stripe (subscriptions, usage meters, webhooks, customer portal) |
| LLM | Multi-provider streaming (Anthropic, OpenAI, Google, Ollama) |
| Fonts | Geist Sans / Geist Mono |
| Notifications | Sonner |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- A Firebase project with Firestore + Authentication enabled
- A Stripe account (for billing features)
- At least one LLM API key (Anthropic, OpenAI, or Google)

### Installation

```bash
git clone https://github.com/berch-t/kopern
cd kopern
npm install
```

### Environment Variables

Create `.env.local` at the root:

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

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# LLM API Keys (add the ones you need)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=AI...
OLLAMA_BASE_URL=http://localhost:11434
```

### Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### Run

```bash
npm run dev      # Development server on http://localhost:3000
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
npx tsc --noEmit # Type check
```

---

## How to Use

### 1. Create an Agent

1. Sign in via Google, GitHub, or email
2. Click **New Agent** on the dashboard
3. Fill in: name, description, domain (accounting, legal, devops, support, sales...)
4. Pick a model provider + model ID
5. Set the extended thinking level
6. Write a system prompt
7. Save — your agent is created

### 2. Add Skills, Tools, and Extensions

From the agent detail page:

- **Skills** — Markdown templates injected as `<skill>` XML blocks into the system prompt. Use them for reusable instructions (tone guides, response formats, domain knowledge).
- **Tools** — Define custom tools with a JSON Schema for parameters and JavaScript code for execution. The agent can invoke them during conversation (up to 10 iterations per turn).
- **Extensions** — TypeScript event hooks (25+ event types) that intercept the agent lifecycle for safety, logging, cost control, or compliance.

### 3. Connect GitHub Repositories

1. Sign in with **GitHub** (grants `repo` scope) — or link GitHub from **Settings** if you signed in with Google
2. Go to any agent detail page
3. Click **Connect Repo** — select repos from the dialog
4. The agent can now read files and search code in connected repos

### 4. Test in the Playground

Click **Playground** to open a live chat. Messages stream in real-time via SSE. Tool calls are displayed inline with arguments and results. The metrics bar shows tokens, cost, and tool calls.

### 5. Grade your Agent

1. Go to **Grading** and create a test suite
2. Add test cases with input prompts and weighted criteria:
   - `output_match` — regex/substring matching
   - `schema_validation` — JSON Schema (ajv)
   - `tool_usage` — assert specific tools were called
   - `safety_check` — detect XSS, injection patterns
   - `custom_script` — arbitrary JavaScript evaluation
   - `llm_judge` — another LLM evaluates the output
3. Run the suite — results are persisted to Firestore with per-case scores
4. The weighted score appears on the agent card

### 6. Expose as an API (MCP Servers)

1. Go to agent detail > **MCP Servers**
2. Click **New Server** — an API key is generated (shown once, copy it)
3. External apps call your agent via JSON-RPC:

```bash
curl -X POST https://your-domain.com/api/mcp \
  -H "Authorization: Bearer kpn_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "completion/create",
    "params": { "message": "Hello, how can you help me?" },
    "id": 1
  }'
```

### 7. Orchestrate with Teams & Pipelines

- **Teams** — Combine multiple agents (parallel, sequential, or conditional). Execute via SSE with real-time member status tracking.
- **Pipelines** — Define multi-step workflows for a single agent. Each step's output feeds the next.

### 8. Navigate the App

All routes are prefixed with the locale (`/en/...` or `/fr/...`). The middleware auto-detects your language.

| Route | Purpose |
|-------|---------|
| `/` | Landing page (public, with meta-agent creator) |
| `/pricing` | Pricing tiers (public) |
| `/examples` | 15+ agent templates (public) |
| `/examples/[slug]` | Template detail + "Use this Agent" button |
| `/dashboard` | Agent overview + MCP endpoints info |
| `/agents` | Agent list + create new |
| `/agents/[id]` | Agent detail — config, GitHub, skills/tools/extensions/grading/playground/MCP/pipelines/sessions |
| `/agents/[id]/playground` | Live chat with your agent |
| `/agents/[id]/grading` | Test suites, cases, and run history |
| `/agents/[id]/mcp-servers` | API endpoints for this agent |
| `/agents/[id]/pipelines` | Multi-step workflows |
| `/agents/[id]/sessions` | Conversation history + observability |
| `/teams` | Agent teams + create new |
| `/teams/[id]` | Team detail + execute |
| `/billing` | Usage tracking, per-agent breakdown, history chart |
| `/api-keys` | All MCP servers across all agents |
| `/docs` | Full platform documentation (EN/FR) with MCP integration tutorial |
| `/settings` | User preferences, API keys, GitHub connection |

---

## Architecture

### Project Structure

```
src/
├── actions/              # Client-side Firestore mutations
├── app/
│   ├── [locale]/         # All localized routes (en/fr)
│   │   ├── (auth)/login/ # Authentication page
│   │   ├── (dashboard)/  # Protected routes (Sidebar + Header layout)
│   │   │   ├── agents/   # CRUD, detail, skills, tools, extensions, grading, playground, MCP, pipelines, sessions
│   │   │   ├── teams/    # Team CRUD + execution
│   │   │   ├── billing/  # Usage tracking + Stripe subscription management
│   │   │   ├── api-keys/ # Global API endpoints view
│   │   │   ├── docs/     # Platform documentation (EN/FR)
│   │   │   └── settings/ # User preferences + GitHub connection
│   │   ├── (public)/     # Public routes (no auth required)
│   │   │   └── examples/ # Agent templates gallery + detail
│   │   ├── pricing/      # Public pricing page
│   │   └── page.tsx      # Landing page (hero meta-agent creator)
│   └── api/
│       ├── agents/[agentId]/chat/                   # SSE streaming chat
│       ├── agents/[agentId]/grading/[suiteId]/run/  # Grading runner + Firestore persistence
│       ├── agents/[agentId]/pipelines/[pipelineId]/execute/  # Pipeline execution
│       ├── agents/meta-create/                      # Meta-agent creation SSE
│       ├── teams/[teamId]/execute/                  # Team execution SSE
│       ├── stripe/checkout|webhook|subscription|portal/  # Stripe billing
│       ├── github/repos|content/                    # GitHub proxy (admin SDK)
│       ├── mcp/           # Public JSON-RPC endpoint + key management
│       ├── bug-report/    # Bug report submission
│       └── health/        # Liveness check
├── components/
│   ├── agents/           # AgentCard, AgentForm, GitHubConnector, ModelSelector, BrandingEditor...
│   ├── code/             # Monaco editor wrapper
│   ├── docs/             # docs-content (EN/FR), TableOfContents, MarkdownRenderer
│   ├── grading/          # CaseEditor, CriteriaForm, ResultsTable, ScoreBadge...
│   ├── layout/           # Sidebar (desktop + MobileSidebar), Header, Breadcrumbs, LocaleSwitcher
│   ├── mcp/              # ApiKeyDisplay, McpServerCard, UsageStats
│   ├── motion/           # FadeIn, SlideUp, StaggerChildren, AnimatedCounter
│   ├── observability/    # LiveMetrics, SessionTimeline, UsageBarChart
│   ├── pipelines/        # PipelineBuilder, PipelineStepCard
│   ├── playground/       # ChatContainer, MessageBubble, ToolCallDisplay, PurposeDialog, TillDoneWidget
│   ├── teams/            # TeamCard, TeamMemberList
│   ├── skills/           # SkillEditor, SkillList
│   ├── tools/            # ToolForm, ToolList, BuiltinToolSelector
│   └── ui/               # shadcn/ui primitives
├── data/                 # Use-case examples + meta-agent template
├── hooks/
│   ├── useAuth.ts              # Firebase auth state
│   ├── useAgent.ts             # Playground agent hook (streaming, metrics, error handling)
│   ├── useFirestore.ts         # Real-time subscriptions
│   ├── useSSE.ts               # Server-Sent Events consumer (error body parsing)
│   ├── useSubscription.ts      # Stripe subscription state
│   ├── useLocalizedRouter.ts   # Locale-prefixed router
│   └── useLocalizedUseCases.ts # Localized use-case data
├── i18n/
│   ├── config.ts               # Locale types ("en" | "fr")
│   ├── getDictionary.ts        # Async dictionary loader
│   └── dictionaries/           # en.json, fr.json (~700 keys each)
├── lib/
│   ├── firebase/         # config, auth (GitHub credential linking), admin, firestore
│   ├── stripe/           # config, plan-guard, server (transactional customer creation)
│   ├── grading/          # Runner + 6 criteria engines
│   ├── llm/              # Multi-provider streaming client
│   ├── tools/            # agent-tools, run-agent (shared agentic loop with extensions)
│   ├── billing/          # track-usage-server (Firestore + Stripe meters), pricing
│   ├── extensions/       # Extension runner + event types
│   ├── mcp/              # API key auth + token counting
│   ├── sandbox/          # Sandboxed JS executor (vm module)
│   └── utils/            # SSE helpers, cn()
├── middleware.ts          # Locale detection + redirect
└── providers/            # AuthProvider, ThemeProvider, LocaleProvider
```

### Firestore Schema

```
users/{userId}
│   ├── githubAccessToken              # GitHub OAuth token (repo scope)
│   ├── stripeCustomerId               # Stripe customer ID
│   ├── plan / planStatus              # Subscription state (synced via webhooks)
│   └── agents/{agentId}
│       ├── connectedRepos[]           # GitHub repos this agent can access
│       ├── latestGradingScore         # Updated after each grading run
│       ├── skills/{skillId}
│       ├── tools/{toolId}
│       ├── extensions/{extensionId}
│       ├── versions/{versionId}
│       ├── mcpServers/{serverId}
│       │   └── usage/{yearMonth}      # Atomic token/request counters
│       ├── pipelines/{pipelineId}
│       ├── sessions/{sessionId}
│       └── gradingSuites/{suiteId}
│           ├── cases/{caseId}
│           └── runs/{runId}
│               └── results/{resultId}
│
│   └── agentTeams/{teamId}
│   └── usage/{yearMonth}              # Per-agent breakdown + grading runs counter

apiKeys/{sha256Hash}                    # O(1) key lookup, admin SDK only
```

### Security Model

- **Firestore Rules** — Owner-only access (`request.auth.uid == userId`), usage docs read-only for client, `apiKeys` collection admin-only
- **API Key Auth** — SHA-256 hashed storage, prefix-only display, server-side generation via `crypto`
- **Plan Enforcement** — `checkPlanLimits()` called on all 6 API routes before execution, returns 403 with error message
- **Stripe Security** — Webhook signature verification, Stripe IDs stripped from client responses, transactional customer creation, runtime input validation on checkout
- **Dashboard Guard** — Client-side redirect to `/login` for unauthenticated users
- **Admin SDK Isolation** — Key creation, deletion, and usage tracking run server-side only
- **GitHub Auth** — No `fetchSignInMethodsForEmail` (broken with Email Enumeration Protection since 2023), direct popup + credential linking

### Data Flow

```
User → Dashboard → Agent Config → Playground (SSE streaming + tool calling)
                                → Grading Suite → Run → Firestore persistence → Score
                                → MCP Server → API Key → POST /api/mcp → LLM → Usage Tracking
                                → Team/Pipeline → SSE execution → Per-member/step metrics

All routes → checkPlanLimits() → trackUsageServer() → Firestore + Stripe Meters
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add all `.env.local` variables in Vercel dashboard
4. Deploy

### Stripe Setup

1. Create products/prices in Stripe Dashboard (Pro monthly/annual, Enterprise monthly/annual)
2. Create a Billing Meter for usage-based tracking
3. Configure webhook endpoint: `https://your-domain.com/api/stripe/webhook`
4. Register 9 webhook events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `invoice.paid`, `invoice.payment_failed`, `invoice.finalization_failed`

### Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## License

Private project.
