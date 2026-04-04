/** MCP Documentation — English */
export const mcpDocsMarkdown = `
## Overview

Kopern exposes its entire platform through the **Model Context Protocol (MCP)** — an open standard for connecting AI tools and agents. With 32 tools covering the full agent lifecycle, you can build, test, grade, optimize, and deploy agents entirely from your terminal or IDE.

**Key facts:**
- **32 MCP tools** across 9 categories
- **2 key types**: agent-bound (32 tools) and user-level (30 tools)
- **3 guided workflows** via MCP Prompts
- **Tool annotations** for smart client UIs
- **Zero dependencies** — just Node.js 18+

---

## Quick Start

### Option 1: NPM Package (Recommended)

**Claude Code** — one command:

\`\`\`bash
claude mcp add kopern -- npx -y @kopern/mcp-server
\`\`\`

**Cursor / Windsurf** — add to your \`.mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "kopern": {
      "command": "npx",
      "args": ["-y", "@kopern/mcp-server"],
      "env": {
        "KOPERN_API_KEY": "kpn_your_key_here"
      }
    }
  }
}
\`\`\`

### Get your API key

1. Log in to [kopern.ai](https://kopern.ai)
2. **Agent-bound key**: open your agent → **API Keys** tab → **Generate Key**
3. **User-level key**: go to **Settings** → **Personal API Key** → **Generate**
4. Copy the key immediately — it is shown only once

Then set it as an environment variable:

\`\`\`bash
export KOPERN_API_KEY=kpn_your_key_here
\`\`\`

The [\`@kopern/mcp-server\`](https://npmjs.com/package/@kopern/mcp-server) package is a lightweight stdio-to-HTTP bridge (5KB, zero deps).

### Option 2: Direct HTTP

Add to your \`.mcp.json\`:

\`\`\`json
{
  "mcpServers": {
    "kopern": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_your_key"
      }
    }
  }
}
\`\`\`

---

## Authentication

### Two Key Types

| Key Type | Scope | Tools | How to Create |
|----------|-------|-------|---------------|
| **Agent-bound** | Tied to one agent | All 32 tools (includes \`kopern_chat\`, \`kopern_agent_info\`) | Agent detail page → API Keys tab |
| **User-level** | Not bound to any agent | 30 platform tools | Settings → Personal API Key |

**When to use which:**
- **Agent-bound**: Chat with a specific agent via MCP, or when all operations target one agent
- **User-level**: Platform operations — creating agents, managing teams, running grading across agents

### Key Format

All keys use the \`kpn_\` prefix followed by 32 random hex bytes (64 characters). Only the SHA-256 hash is stored — the plaintext key is shown once at creation and cannot be retrieved.

### Rate Limits

- **30 requests/minute** per key (sliding window)
- HTTP 429 response with \`Retry-After\` header when exceeded
- Rate limits apply per-key, not per-user

---

## Protocol Reference

### Endpoint

\`\`\`
POST https://kopern.ai/api/mcp/server
Content-Type: application/json
Authorization: Bearer kpn_your_key
\`\`\`

### Transport

Implements the MCP **Streamable HTTP** transport (spec 2024-11-05). All requests use JSON-RPC 2.0.

### Supported Methods

| Method | Description |
|--------|-------------|
| \`initialize\` | Handshake — returns protocol version, capabilities, server info |
| \`tools/list\` | List available tools (up to 32) |
| \`tools/call\` | Execute a tool |
| \`prompts/list\` | List guided workflows (3 prompts) |
| \`prompts/get\` | Get a specific prompt template |
| \`ping\` | Keepalive check |

### Initialize

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "clientInfo": { "name": "my-client", "version": "1.0" }
  },
  "id": 1
}
\`\`\`

Response:

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": { "tools": {}, "prompts": {} },
    "serverInfo": { "name": "kopern-mcp", "version": "2.0.0" }
  },
  "id": 1
}
\`\`\`

### Tools List

\`\`\`json
{ "jsonrpc": "2.0", "method": "tools/list", "id": 2 }
\`\`\`

Returns all tools available for your key type, each with:
- \`name\`: Tool identifier (e.g., \`kopern_create_agent\`)
- \`description\`: What the tool does
- \`inputSchema\`: JSON Schema for arguments
- \`annotations\`: Hints for client UIs (readOnly, destructive, etc.)

### Tools Call

\`\`\`json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "kopern_create_agent",
    "arguments": {
      "name": "Support Bot",
      "system_prompt": "You are a helpful support agent.",
      "provider": "anthropic",
      "model": "claude-sonnet-4-6"
    }
  },
  "id": 3
}
\`\`\`

Response:

\`\`\`json
{
  "jsonrpc": "2.0",
  "result": {
    "content": [
      { "type": "text", "text": "Agent created successfully.\\nAgent ID: abc123..." }
    ]
  },
  "id": 3
}
\`\`\`

---

## Tool Reference

### Agent Management (8 tools)

| Tool | Description | Key Type |
|------|-------------|----------|
| \`kopern_chat\` | Send a message to an agent (with tool calling) | Agent-bound only |
| \`kopern_agent_info\` | Get agent metadata | Agent-bound only |
| \`kopern_create_agent\` | Create a new agent | Any |
| \`kopern_get_agent\` | Get agent configuration | Any |
| \`kopern_update_agent\` | Update agent settings | Any |
| \`kopern_delete_agent\` | Delete an agent | Any |
| \`kopern_list_agents\` | List all agents | Any |
| \`kopern_list_templates\` | List available templates (general + vertical) | Any |

#### kopern_create_agent

\`\`\`json
{
  "name": "Support Bot",
  "system_prompt": "You are a helpful support agent for TechStore.",
  "description": "Customer support",
  "domain": "support",
  "provider": "anthropic",
  "model": "claude-sonnet-4-6",
  "builtin_tools": ["web_fetch", "memory"],
  "skills": [
    { "name": "product-knowledge", "content": "# Products\\n- Widget Pro: $99/mo..." }
  ]
}
\`\`\`

#### kopern_update_agent

\`\`\`json
{
  "agent_id": "abc123",
  "system_prompt": "Updated prompt...",
  "builtin_tools": ["web_fetch", "memory", "code_interpreter"]
}
\`\`\`

Only provided fields are updated. Omitted fields remain unchanged.

#### kopern_deploy_template

\`\`\`json
{
  "slug": "legal-assistant",
  "answers": {
    "specialite": "Droit des affaires",
    "cabinet": "Cabinet Dupont"
  }
}
\`\`\`

### Grading & Optimization (6 tools)

| Tool | Description |
|------|-------------|
| \`kopern_grade_prompt\` | Quick-grade a system prompt with test cases (no agent required) |
| \`kopern_create_grading_suite\` | Create a persistent grading suite for an agent |
| \`kopern_run_grading\` | Execute a grading suite |
| \`kopern_get_grading_results\` | Get detailed results for a grading run |
| \`kopern_list_grading_runs\` | List past grading runs for a suite |
| \`kopern_run_autoresearch\` | Run AutoTune optimization (iterative prompt improvement) |

#### kopern_grade_prompt

\`\`\`json
{
  "system_prompt": "You are a legal assistant...",
  "test_cases": [
    {
      "name": "Contract review",
      "input": "Review this NDA clause: ...",
      "expected": "Identifies key risks and suggests improvements"
    },
    {
      "name": "Greeting",
      "input": "Hello",
      "expected": "Professional greeting mentioning legal expertise"
    }
  ],
  "provider": "anthropic",
  "model": "claude-sonnet-4-6"
}
\`\`\`

#### kopern_run_autoresearch

\`\`\`json
{
  "agent_id": "abc123",
  "suite_id": "suite456",
  "max_iterations": 5,
  "target_score": 0.95,
  "max_token_budget": 500000
}
\`\`\`

### Teams & Pipelines (4 tools)

| Tool | Description |
|------|-------------|
| \`kopern_create_team\` | Create a multi-agent team with execution mode |
| \`kopern_run_team\` | Execute a team with a prompt |
| \`kopern_create_pipeline\` | Create a multi-step pipeline for an agent |
| \`kopern_run_pipeline\` | Execute a pipeline |

#### kopern_create_team

\`\`\`json
{
  "name": "Marketing Team",
  "description": "Content creation pipeline",
  "execution_mode": "sequential",
  "agents": [
    { "agent_id": "strategist123", "role": "Content strategist", "order": 0 },
    { "agent_id": "copywriter456", "role": "Copywriter", "order": 1 },
    { "agent_id": "publisher789", "role": "Publisher", "order": 2 }
  ]
}
\`\`\`

Execution modes:
- **sequential**: Agents run in order, each receiving the previous agent's output
- **parallel**: All agents run simultaneously on the same prompt
- **conditional**: First agent routes to the most appropriate specialist

#### kopern_run_team

\`\`\`json
{
  "team_id": "team789",
  "prompt": "Create the editorial plan for this week"
}
\`\`\`

### Connectors (7 tools)

| Tool | Description |
|------|-------------|
| \`kopern_connect_widget\` | Deploy agent as an embeddable chat widget |
| \`kopern_connect_telegram\` | Connect agent to a Telegram bot |
| \`kopern_connect_whatsapp\` | Connect agent to WhatsApp Business |
| \`kopern_connect_slack\` | Connect agent to a Slack workspace |
| \`kopern_connect_webhook\` | Set up inbound/outbound webhooks |
| \`kopern_connect_email\` | Connect Google/Microsoft email (OAuth) |
| \`kopern_connect_calendar\` | Connect Google/Microsoft calendar (OAuth) |

#### kopern_connect_widget

\`\`\`json
{
  "agent_id": "abc123",
  "welcome_message": "Hi! How can I help?",
  "position": "bottom-right",
  "allowed_origins": ["https://mysite.com"]
}
\`\`\`

#### kopern_connect_webhook

\`\`\`json
{
  "agent_id": "abc123",
  "type": "outbound",
  "name": "n8n Integration",
  "target_url": "https://my-n8n.cloud/webhook/kopern",
  "secret": "my_hmac_secret",
  "events": ["message_sent", "tool_call_completed"]
}
\`\`\`

### Sessions & Monitoring (5 tools)

| Tool | Description |
|------|-------------|
| \`kopern_list_sessions\` | List conversation sessions for an agent |
| \`kopern_get_session\` | Get detailed session with messages and events |
| \`kopern_manage_memory\` | CRUD operations on agent memory (remember/recall/forget/list) |
| \`kopern_compliance_report\` | Generate EU AI Act compliance report |
| \`kopern_get_usage\` | Get token usage and cost metrics |

#### kopern_manage_memory

\`\`\`json
{
  "agent_id": "abc123",
  "action": "remember",
  "key": "company_name",
  "value": "TechStore Inc.",
  "category": "context"
}
\`\`\`

Actions: \`remember\` (create/update), \`recall\` (read by key or query), \`forget\` (delete by key), \`list\` (list all).

#### kopern_get_usage

\`\`\`json
{
  "year_month": "2026-04",
  "include_history": true
}
\`\`\`

### Portability (2 tools)

| Tool | Description |
|------|-------------|
| \`kopern_export_agent\` | Export agent as portable JSON (config, skills, tools, extensions) |
| \`kopern_import_agent\` | Import agent from exported JSON |

---

## Tool Annotations

Every tool includes MCP annotations that help client UIs make smart decisions:

| Annotation | Meaning | Example Tools |
|-----------|---------|---------------|
| \`readOnlyHint: true\` | Safe to auto-approve, no side effects | \`list_agents\`, \`get_session\`, \`get_usage\` |
| \`destructiveHint: true\` | May permanently delete data | \`delete_agent\` |
| \`idempotentHint: true\` | Safe to retry without side effects | \`update_agent\`, \`connect_widget\` |
| \`openWorldHint: true\` | Makes external API calls | \`chat\`, \`grade_prompt\`, \`run_grading\` |

---

## Guided Workflows (MCP Prompts)

Three step-by-step workflows are available via \`prompts/list\`:

### create-agent

Walks you through building an agent from scratch:
1. Define the use case and domain
2. Write the system prompt
3. Add skills and tools
4. Configure model and settings
5. Create the agent

### grade-and-improve

Iterative quality improvement cycle:
1. Create or select a grading suite
2. Run grading
3. Analyze results and identify weaknesses
4. Apply improvements
5. Re-grade to measure progress

### deploy-everywhere

Deploy an agent across all available channels:
1. Set up embeddable chat widget
2. Connect Telegram bot
3. Configure Slack integration
4. Set up webhooks for n8n/Zapier/Make
5. Verify all deployments

---

## Usage & Billing

### Token Tracking

All tokens consumed through MCP are tracked and billed:
- **Firestore**: Atomic increments in \`users/{userId}/usage/{yearMonth}\`
- **Stripe**: Metered billing events for usage-based plans
- **Per-agent**: Breakdown by agent for cost attribution

### Plan Limits

Plan-specific operations are enforced:
- \`kopern_run_grading\`, \`kopern_run_autoresearch\` — require grading quota
- \`kopern_create_team\`, \`kopern_run_team\` — require teams quota
- \`kopern_chat\` — counts against token limits

### Cost Estimation

Token costs depend on the model used by each agent. See the [Pricing page](/pricing) for details.

---

## Self-Hosted

Run the MCP server locally with Docker:

\`\`\`bash
# Clone and configure
cp .env.example .env.local
# Set Firebase, Stripe, and LLM keys

# Start
docker compose up -d
\`\`\`

The self-hosted server exposes the same MCP endpoint at \`http://localhost:3000/api/mcp/server\`.

For fully local operation: Firebase Emulator + Ollama = zero cloud dependencies.

---

## Registries

The Kopern MCP server is listed on:

| Registry | Status | Link |
|----------|--------|------|
| **npm** | Published (v2.0.4) | [\`@kopern/mcp-server\`](https://npmjs.com/package/@kopern/mcp-server) |
| **Smithery** | Score 80/100 | [kopern.run.tools](https://smithery.ai/server/@kopern/grader) |
| **Glama** | Approved | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) |
| **OpenTools** | Submitted | [opentools.com](https://opentools.com) |
| **MCPTotal** | Submitted | [mcptotal.com](https://mcptotal.com) |

---

## Troubleshooting

### Connection Issues

**"Invalid API key"** — Verify your key starts with \`kpn_\` and hasn't expired. Generate a new key in Settings.

**"Rate limited (429)"** — Wait for the \`Retry-After\` duration. Consider spreading operations across time.

**"Tool not found"** — Check your key type. \`kopern_chat\` requires an agent-bound key, not a user-level key.

### Common Patterns

**Agent-bound key but want platform tools?** Agent-bound keys have access to all 32 tools including platform operations. Use one key for everything.

**Multiple agents from one key?** Use a user-level key and pass \`agent_id\` to tools that require it.

**Webhook integration?** Use \`kopern_connect_webhook\` to set up n8n/Zapier/Make integrations. Supports HMAC-SHA256 signature verification.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-04-05 | Agentic Engine Upgrade — parallel tool execution, billing audit |
| 2026-04-04 | Image generation builtin, team image URL chaining, maxDuration 600s |
| 2026-04-03 | Tool annotations, MCP Prompts (3 workflows), Smithery 80/100 |
| 2026-04-02 | MCP v2.0.0 — 32 tools, user-level keys, self-hosted Docker |
| 2026-04-01 | MCP v1.1.0 — 19 tools (agent CRUD, grading, teams, connectors) |
| 2026-03-01 | Initial MCP Streamable HTTP server |
`;
