# Kopern

**AI Agent Builder & Grader** — Create custom business AI agents, validate them through deterministic grading pipelines, and expose them as API endpoints.

Built with Next.js 16, Firebase, and a multi-provider LLM streaming engine.

---

## Features

- **Agent Builder** — Configure agents with system prompts, skills, custom tools, and extensions
- **Multi-Model** — Anthropic, OpenAI, Google Gemini, Ollama (local) via a unified streaming interface
- **Extended Thinking** — 6 levels (off, minimal, low, medium, high, xhigh) for supported providers
- **Deterministic Grading** — 6 criterion types: output match, schema validation, tool usage, safety check, custom script, LLM judge
- **Test Suites** — Organize grading cases, track runs over time, compute weighted scores
- **Playground** — Live chat with SSE streaming, markdown rendering, tool call visualization
- **MCP Servers** — Expose agents as JSON-RPC API endpoints with API key auth, rate limiting, and per-token usage tracking
- **GitHub Integration** — Connect repositories to agents via native OAuth. Agents can access your code for reviews, analysis, and automation
- **Internationalization** — Full English/French support with `[locale]` route segments, middleware locale detection, and JSON dictionaries
- **Pricing Page** — 3 tiers (Starter free, Pro $79/mo, Enterprise $499/mo) with monthly/annual toggle and feature comparison
- **Examples Gallery** — 15 production-ready agent templates with "Use this Agent" one-click deployment
- **Version Control** — Snapshot agents, track grading history per version
- **Authentication** — Firebase Auth (Google, GitHub with `repo` scope, Email/Password)
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
| LLM | Multi-provider streaming (Anthropic, OpenAI, Google, Ollama) |
| Fonts | Geist Sans / Geist Mono |
| Notifications | Sonner |

---

## Getting Started

### Prerequisites

- Node.js >= 20
- A Firebase project with Firestore + Authentication enabled
- At least one LLM API key (Anthropic, OpenAI, or Google)

### Installation

```bash
git clone <repo-url>
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
```

---

## How to Use

### 1. Create an Agent

1. Sign in via Google, GitHub, or email
2. Click **New Agent** on the dashboard
3. Fill in: name, description, domain (accounting, legal, devops, support, sales...)
4. Pick a model provider + model ID (e.g. `anthropic` / `claude-sonnet-4-5-20250514`)
5. Set the extended thinking level
6. Write a system prompt
7. Save — your agent is created at version 1

### 2. Add Skills, Tools, and Extensions

From the agent detail page:

- **Skills** — Markdown templates injected as `<skill>` XML blocks into the system prompt. Use them for reusable instructions (tone guides, response formats, domain knowledge).
- **Tools** — Define custom tools with a JSON Schema for parameters and JavaScript code for execution. The agent can invoke them during conversation.
- **Extensions** — TypeScript modules that hook into agent events to add custom behaviors.

### 3. Test in the Playground

Click **Playground** to open a live chat with your agent. Messages stream in real-time via SSE. Tool calls are displayed inline.

### 4. Grade your Agent

1. Go to **Grading** and create a test suite
2. Add test cases — each has an input prompt, expected behavior, and weighted criteria
3. Available criterion types:
   - `output_match` — regex/substring matching
   - `schema_validation` — JSON Schema (ajv)
   - `tool_usage` — assert specific tools were called
   - `safety_check` — detect XSS, injection patterns
   - `custom_script` — arbitrary JavaScript evaluation
   - `llm_judge` — another LLM evaluates the output
4. Run the suite — each case is executed, scored, and stored
5. The weighted score appears on the agent card

### 5. Expose as an API (MCP Servers)

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

**Response:**

```json
{
  "jsonrpc": "2.0",
  "result": {
    "content": "Hello! I'm here to help you with...",
    "usage": { "inputTokens": 245, "outputTokens": 512 }
  },
  "id": 1
}
```

**Supported methods:**

| Method | Description |
|--------|------------|
| `initialize` | Returns agent name, description, model info |
| `completion/create` | Sends a message, returns full LLM response + token usage |

4. Monitor usage (requests, input/output tokens) on the server detail page
5. Disable/enable or regenerate keys at any time

### 6. Connect GitHub Repositories

1. Sign in with **GitHub** (grants `repo` scope automatically)
2. Go to any agent detail page
3. Click **Connect Repo** — a dialog lists all your GitHub repos
4. Select repos — the agent can now access that code
5. Connected repos are stored per-agent and visible on the detail page

### 7. Navigate the App

All routes are prefixed with the locale (`/en/...` or `/fr/...`). The middleware auto-detects your language.

| Route | Purpose |
|-------|---------|
| `/` | Landing page (public) |
| `/pricing` | Pricing tiers (public) |
| `/examples` | 15 agent templates (public) |
| `/examples/[slug]` | Template detail + "Use this Agent" button |
| `/dashboard` | Agent overview + MCP endpoints info |
| `/agents` | Agent list + create new |
| `/agents/[id]` | Agent detail — config, GitHub connector, skills/tools/grading/playground/MCP |
| `/agents/[id]/playground` | Live chat with your agent |
| `/agents/[id]/grading` | Test suites, cases, and run history |
| `/agents/[id]/mcp-servers` | API endpoints for this agent |
| `/api-keys` | All MCP servers across all agents |
| `/docs` | Full platform documentation (EN/FR) |
| `/settings` | User preferences |

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
│   │   │   ├── agents/   # CRUD, detail, edit, skills, tools, extensions
│   │   │   │   └── [agentId]/
│   │   │   │       ├── edit/
│   │   │   │       ├── skills/
│   │   │   │       ├── tools/
│   │   │   │       ├── extensions/
│   │   │   │       ├── playground/
│   │   │   │       ├── grading/
│   │   │   │       │   └── [suiteId]/runs/[runId]/
│   │   │   │       └── mcp-servers/
│   │   │   │           └── [serverId]/
│   │   │   ├── api-keys/ # Global API endpoints view
│   │   │   ├── docs/     # Platform documentation (EN/FR)
│   │   │   └── settings/
│   │   ├── (public)/     # Public routes (no auth required)
│   │   │   └── examples/ # Agent templates gallery + detail
│   │   ├── pricing/      # Public pricing page
│   │   └── page.tsx      # Landing page
│   └── api/
│       ├── agents/[agentId]/chat/                   # SSE streaming chat
│       ├── agents/[agentId]/grading/[suiteId]/run/  # Grading runner
│       ├── github/repos/  # GitHub repos proxy (admin SDK)
│       ├── mcp/           # Public JSON-RPC endpoint
│       ├── mcp/keys/      # API key management (admin SDK)
│       └── health/
├── components/
│   ├── agents/           # AgentCard, AgentForm, GitHubConnector, ModelSelector
│   ├── code/             # Monaco editor wrapper
│   ├── docs/             # docs-content (EN), docs-content-fr (FR), TableOfContents
│   ├── grading/          # CaseEditor, CriteriaForm, ResultsTable, ScoreBadge...
│   ├── layout/           # Sidebar, Header, Breadcrumbs, LocaleSwitcher
│   ├── mcp/              # ApiKeyDisplay, McpServerCard, UsageStats
│   ├── motion/           # FadeIn, SlideUp, StaggerChildren, AnimatedCounter
│   ├── playground/       # ChatContainer, MessageBubble, ToolCallDisplay
│   ├── shared/           # MarkdownRenderer, LocalizedLink
│   ├── skills/           # SkillEditor, SkillList
│   ├── tools/            # ToolForm, ToolList, BuiltinToolSelector
│   └── ui/               # shadcn/ui primitives
├── data/                 # Use-case examples + French translations
├── hooks/
│   ├── useAuth.ts              # Firebase auth state
│   ├── useFirestore.ts         # Real-time subscriptions
│   ├── useSSE.ts               # Server-Sent Events consumer
│   ├── useLocalizedRouter.ts   # Locale-prefixed router
│   └── useLocalizedUseCases.ts # Localized use-case data
├── i18n/
│   ├── config.ts               # Locale types ("en" | "fr")
│   ├── getDictionary.ts        # Async dictionary loader
│   └── dictionaries/           # en.json, fr.json (~350 keys each)
├── lib/
│   ├── firebase/         # config, auth (+GitHub repo scope), admin, firestore
│   ├── grading/          # Runner + 6 criteria engines
│   ├── llm/              # Multi-provider streaming client
│   ├── mcp/              # API key auth + token counting
│   └── utils/            # SSE helpers, cn()
├── middleware.ts          # Locale detection + redirect
└── providers/            # AuthProvider, ThemeProvider, LocaleProvider
```

### Firestore Schema

```
users/{userId}
│   ├── githubAccessToken              # GitHub OAuth token (repo scope)
│   └── agents/{agentId}
│       ├── connectedRepos[]           # GitHub repos this agent can access
│       ├── skills/{skillId}
│       ├── tools/{toolId}
│       ├── extensions/{extensionId}
│       ├── versions/{versionId}
│       ├── mcpServers/{serverId}
│       │   └── usage/{yearMonth}      # Atomic token/request counters
│       └── gradingSuites/{suiteId}
│           ├── cases/{caseId}
│           └── runs/{runId}
│               └── results/{resultId}

apiKeys/{sha256Hash}                    # O(1) key lookup, admin SDK only
```

### Security Model

- **Firestore Rules** — Owner-only access (`request.auth.uid == userId`), usage docs read-only for client, `apiKeys` collection admin-only
- **API Key Auth** — SHA-256 hashed storage, prefix-only display, server-side generation via `crypto`
- **Dashboard Guard** — Client-side redirect to `/login` for unauthenticated users
- **Admin SDK Isolation** — Key creation, deletion, and usage tracking run server-side only

### Data Flow

```
User → Dashboard → Agent Config → Playground (SSE streaming)
                                → Grading Suite → Run → Criterion Evaluation → Score
                                → MCP Server → API Key → POST /api/mcp → LLM → Usage Tracking
```

---

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in Vercel
3. Add all `.env.local` variables in Vercel dashboard
4. Deploy

### Firebase

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## License

Private project.
