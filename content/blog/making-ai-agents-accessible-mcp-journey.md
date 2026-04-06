---
title: "Making AI Agents Accessible: Our MCP Journey from 0 to 32 Tools"
description: "How we built Kopern's MCP server — 32 tools, two key types, five registry listings, and the realization that standalone tools are a dead end."
date: "2026-04-06"
author: "berch-t"
authorRole: "Founder & Lead Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/company/kopern"
tags: ["mcp", "developer-tools", "open-source", "npm", "api"]
image: "/blog/mcp_journey/dead_end.jpeg"
locale: "en"
---

## Why MCP

Model Context Protocol (MCP) is how AI coding assistants — Claude Code, Cursor, Windsurf — connect to external services. When we looked at Kopern's competitive position, we realized the web dashboard was necessary but not sufficient. Developers live in their terminals and IDEs. If they can't create, grade, and deploy agents without opening a browser, we're adding friction.

MCP turns Kopern into **Kopern-as-a-Service**: the entire platform accessible from any MCP-compatible client. Same capabilities as the UI, zero browser required.

## The Dead End: Standalone Tools

Our first MCP implementation was a single tool: `kopern_grade_prompt`. Paste a system prompt, get a grading score. Simple, clean, ship it.

It was a dead end.

The developer gets a score — then what? They can't fix the issues without Kopern. They can't create an agent, deploy it, or set up monitoring. Claude.ai already does "improve my prompt" natively. A standalone grading tool provides no reason to adopt Kopern.

The lesson: **MCP must expose the complete workflow, not atomic operations.** The value is in the cycle: create → grade → optimize → deploy → orchestrate → monitor. If a user can do the full loop from their terminal, they're hooked.

## V1: 19 Core Tools (April 1)

![Kopern: Tools](/blog/mcp_journey/tools.jpeg)

We shipped the first wave of 19 tools covering the agent lifecycle:

- **Agent CRUD** (5 tools): create, get, update, delete, list
- **Templates** (2): list templates, deploy from template
- **Grading** (3): create suite, run grading, grade a prompt
- **AutoResearch** (1): run optimization (AutoTune/AutoFix/StressLab/Tournament/Distillation/Evolution)
- **Teams** (2): create team, run team
- **Connectors** (5): widget, Telegram, WhatsApp, Slack, webhook
- **Chat** (2): send message, get agent info (agent-bound key only)

All 19 tools were tested with 25 JSON-RPC requests. 100% pass rate on the first test day.

The implementation is split across two files:
- `route.ts`: TOOL_DEFS (schema definitions), request routing, auth, rate limiting
- `platform-tools.ts`: 15 execution functions using Firebase Admin SDK

Every tool that touches billing (grading, autoresearch, teams, pipelines) checks plan limits before execution. Free tier users get appropriate error messages, not silent failures.

## V2: 13 Ecosystem Tools (April 2)

V2 added the tools that make the platform self-sufficient from the terminal:

- **Pipelines** (2): create and run multi-step pipelines
- **Sessions** (2): list conversations, get session details
- **Memory** (1): remember/recall/forget/list agent memories
- **Compliance** (1): generate EU AI Act compliance report
- **Grading Results** (2): get detailed results, list historical runs
- **Email/Calendar** (2): connect Google/Microsoft OAuth service connectors
- **Usage** (1): token consumption and cost metrics
- **Export/Import** (2): portable agent JSON for backup or migration

The export/import tools deserve a special mention. They enable the **SaaS ↔ self-hosted** bridge: build an agent on kopern.ai, export it as JSON, import it on your self-hosted Docker instance. Full portability.

After V2, the MCP server had **32 tools** at version 2.0.0. Testing found 2 bugs: `customInputTemplate: undefined` rejected by Firestore (undefined values aren't allowed), and a missing try-catch in the dispatch function. Both fixed before the end of the day.

## Two Key Types

![Kopern: Two Key Types](/blog/mcp_journey/two_keys.jpeg)

A subtle but important design decision: we support two types of API keys.

**Agent-bound keys** (existing): tied to a specific agent, give access to all 32 tools including `kopern_chat` and `kopern_agent_info`. This is what you use when your MCP client is a single-agent chatbot.

**User-level keys** (new): not bound to any agent, give access to 30 platform tools. This is what you use when managing your entire Kopern account from the terminal — creating agents, running grading suites, deploying connectors.

The user-level key was critical for developer experience. Without it, you'd need to create an agent first (via the web UI) to get an agent-bound key to create more agents (via MCP). Chicken-and-egg problem. The user-level key breaks the cycle.

## The npm Package

The MCP server itself is a **stdio-to-HTTP bridge** published as `@kopern/mcp-server` on npm. Architecture:

```
Claude Code ←stdin/stdout→ @kopern/mcp-server ←HTTPS→ kopern.ai/api/mcp/server
```

The package is 5KB, zero dependencies, Node 18+. All logic lives on the Kopern API — the npm package just proxies JSON-RPC over stdin/stdout to our Streamable HTTP endpoint. This means:

- Updates are instant (server-side, no npm publish needed)
- The package never handles credentials or business logic
- Install is one command: `npx -y @kopern/mcp-server`

Integration with Claude Code:

```bash
claude mcp add kopern -- npx -y @kopern/mcp-server
```

Then set `KOPERN_API_KEY` in your environment. That's it.

## Registry Listings

![Kopern: Registry Listings](/blog/mcp_journey/registry.jpeg)

Getting listed on MCP registries was an adventure in itself.

### Smithery (score: 80/100)

Smithery rates your MCP server on metadata quality. We started at 41/100. The fixes:
- Tool annotations (readOnlyHint, destructiveHint, idempotentHint, openWorldHint) on all 33 tools
- 3 guided prompts (create-agent, grade-and-improve, deploy-everywhere) via prompts/list + prompts/get
- Detailed parameter descriptions on every tool argument
- Complete server metadata (name, version, description, icons)

Final score: 80/100. Listed at kopern.run.tools.

### Glama

Glama tries to build your entire application for inspection. Our Next.js app is too complex for that approach, so we created a minimal `Dockerfile.glama` that only installs the `@kopern/mcp-server` npm package. With a `glama.json` ($schema + maintainers), we were approved and claimed.

### Others

- **npm**: Live (obviously — it's the package source)
- **Open Tools**: Waitlisted
- **MCPTotal**: Submitted

## Tool Annotations

MCP tool annotations tell clients how to handle each tool safely. We annotated all 33 tools:

```typescript
const TOOL_ANNOTATIONS: Record<string, ToolAnnotations> = {
  kopern_list_agents: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
  kopern_delete_agent: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
  kopern_run_grading: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  // ... 30 more
};
```

This is important for AI clients that auto-approve read-only operations but prompt for confirmation on destructive ones. Getting these wrong means either annoying approval prompts on safe operations, or silent destructive calls.

## MCP Prompts: Guided Workflows

Raw tools are powerful but overwhelming. 32 tools with no guidance is a wall of options. We added three MCP Prompts — guided workflows that walk users through common tasks:

1. **create-agent**: Name → domain → system prompt → builtin tools → deploy
2. **grade-and-improve**: Select agent → run grading → analyze results → run AutoFix → verify improvement
3. **deploy-everywhere**: Select agent → configure widget → set up Telegram → add webhook

When a user runs `kopern_create_agent` for the first time, their MCP client can suggest the "create-agent" prompt to guide them through the complete flow. It's onboarding without a UI.

## Name Resolution

A small quality-of-life feature that made a big difference: `resolveAgentId()` and `resolveTeamId()` accept either a Firestore document ID or an agent/team name.

Before: `kopern_get_agent({ agent_id: "abc123xyz789" })`

After: `kopern_get_agent({ agent_id: "My Support Bot" })`

The function tries a direct document lookup first. If it fails, it queries Firestore by name. Users don't need to remember or copy-paste Firestore IDs.

## Lessons Learned

**Standalone tools are a dead end.** If your MCP server exposes one action, you're a novelty. Expose the full workflow, and you're a platform.

**stdio-to-HTTP bridge > embedded server.** Keep logic server-side. The npm package stays tiny, updates are instant, and you control the entire execution environment.

**Annotations and prompts matter for registry scores.** Smithery doubled our score after we added them. It's metadata, but metadata is discoverability.

**Test with real clients.** We tested every tool with Claude Code running locally. The feedback loop is fast: write tool → test via MCP → fix → repeat. No mock environments, no unit tests pretending to be clients.

The MCP server is open-source. Install it, connect it, build something.

```bash
npm install -g @kopern/mcp-server
```
