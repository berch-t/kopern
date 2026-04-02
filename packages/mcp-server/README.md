# @kopern/mcp-server

[![npm version](https://img.shields.io/npm/v/@kopern/mcp-server.svg)](https://www.npmjs.com/package/@kopern/mcp-server)
[![smithery badge](https://smithery.ai/badge/kopern/mcp-server)](https://smithery.ai/servers/kopern/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**32 AI agent tools for Claude Code, Cursor, Windsurf, and any MCP client.**

Build, test, grade, and deploy AI agents — all from your terminal or IDE.

## Quick Start

### Claude Code

```bash
claude mcp add kopern -- npx -y @kopern/mcp-server
```

Then set your API key:

```bash
export KOPERN_API_KEY=kpn_your_key_here
```

### Manual Configuration

Add to your `.mcp.json` (project) or `~/.claude/settings.json` (global):

```json
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
```

### Cursor / Windsurf

Add to your MCP settings:

```json
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
```

### Streamable HTTP (no install)

If your client supports HTTP MCP transport directly:

```json
{
  "mcpServers": {
    "kopern": {
      "type": "http",
      "url": "https://kopern.ai/api/mcp/server",
      "headers": {
        "Authorization": "Bearer kpn_your_key_here"
      }
    }
  }
}
```

## Get Your API Key

1. Go to [kopern.ai](https://kopern.ai) and sign in
2. Navigate to **Settings** > **API Keys**
3. Click **Generate API Key**
4. Copy the `kpn_...` key

Two key types:
- **User-level key** — access to all 30 platform tools (agent CRUD, grading, templates, etc.)
- **Agent-bound key** — access to all 32 tools including `kopern_chat` and `kopern_agent_info`

## Tools (32)

### Agent Management (8 tools)

| Tool | Description |
|------|-------------|
| `kopern_create_agent` | Create a new agent with system prompt, model, skills, and tools |
| `kopern_get_agent` | Get full agent configuration and metadata |
| `kopern_update_agent` | Update agent system prompt, model, domain, or builtin tools |
| `kopern_delete_agent` | Permanently delete an agent |
| `kopern_list_agents` | List all your agents with scores and versions |
| `kopern_chat` | Send a message to an agent (with tool calling) |
| `kopern_agent_info` | Get agent metadata (agent-bound key only) |
| `kopern_deploy_template` | Deploy from 37 ready-made templates (BTP, Legal, E-commerce...) |

### Grading & Optimization (6 tools)

| Tool | Description |
|------|-------------|
| `kopern_grade_prompt` | Grade a system prompt against inline test cases |
| `kopern_create_grading_suite` | Create a reusable test suite with cases |
| `kopern_run_grading` | Execute a grading suite and get scores |
| `kopern_run_autoresearch` | AutoTune — iterative prompt optimization |
| `kopern_get_grading_results` | Get detailed results for a grading run |
| `kopern_list_grading_runs` | List score history for a suite |

### Teams & Pipelines (4 tools)

| Tool | Description |
|------|-------------|
| `kopern_create_team` | Create multi-agent teams (parallel, sequential, conditional) |
| `kopern_run_team` | Execute a team with a prompt |
| `kopern_create_pipeline` | Create multi-step pipelines with input mapping |
| `kopern_run_pipeline` | Execute a pipeline sequentially |

### Connectors (7 tools)

| Tool | Description |
|------|-------------|
| `kopern_connect_widget` | Deploy an embeddable chat widget |
| `kopern_connect_telegram` | Connect a Telegram bot |
| `kopern_connect_whatsapp` | Connect WhatsApp Business |
| `kopern_connect_slack` | Connect to Slack workspace |
| `kopern_connect_webhook` | Set up inbound/outbound webhooks |
| `kopern_connect_email` | Connect Gmail or Outlook |
| `kopern_connect_calendar` | Connect Google or Microsoft Calendar |

### Sessions & Memory (3 tools)

| Tool | Description |
|------|-------------|
| `kopern_list_sessions` | List conversation sessions with metrics |
| `kopern_get_session` | Get full session details (events, tool calls, tokens) |
| `kopern_manage_memory` | Agent memory CRUD (remember, recall, forget, list) |

### Utilities (4 tools)

| Tool | Description |
|------|-------------|
| `kopern_list_templates` | Browse 37 templates (28 general + 9 vertical) |
| `kopern_compliance_report` | Generate EU AI Act compliance report |
| `kopern_get_usage` | Token usage, cost, per-agent breakdown |
| `kopern_export_agent` | Export agent as portable JSON |
| `kopern_import_agent` | Import agent from JSON export |

## Examples

### Create an agent from your terminal

```
> Use kopern_create_agent to create a customer support agent for my SaaS product
```

### Grade a prompt

```
> Use kopern_grade_prompt to test my system prompt with these cases:
  - "What's your refund policy?" should mention "30-day guarantee"
  - "Can I cancel?" should be empathetic and provide steps
```

### Deploy a template

```
> Use kopern_list_templates to show me business templates, then deploy the "restaurant" one
```

### Full workflow

```
> Create an agent, add a grading suite with 5 test cases, run grading,
  then run autoresearch to optimize the prompt to 90%+ score
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `KOPERN_API_KEY` | Yes | — | Your Kopern API key (`kpn_...`) |
| `KOPERN_URL` | No | `https://kopern.ai/api/mcp/server` | Custom endpoint URL |

## Architecture

This package is a lightweight stdio-to-HTTP bridge. It receives JSON-RPC messages on stdin from your MCP client, forwards them to the Kopern Streamable HTTP endpoint, and returns responses on stdout.

```
Claude Code ──stdin──> @kopern/mcp-server ──HTTP──> kopern.ai/api/mcp/server
            <──stdout──                   <──JSON──
```

The Kopern server handles all MCP protocol methods (`initialize`, `tools/list`, `tools/call`, `ping`). Zero dependencies — just Node.js 18+ and `fetch`.

## Links

- [Kopern Platform](https://kopern.ai)
- [API Documentation](https://kopern.ai/en/api-reference)
- [GitHub](https://github.com/berch-t/kopern)
- [Smithery](https://smithery.ai/server/@kopern/mcp-server)
- [Glama](https://glama.ai/mcp/servers/@kopern/mcp-server)

## License

MIT
