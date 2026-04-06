---
title: "Building Kopern: From Zero to 121 Features in 3 Weeks"
description: "How we built a full-stack AI agent platform from scratch in under a month — the architecture decisions, the disasters, and what we'd do differently."
date: "2026-04-04"
author: "berch-t"
authorRole: "Founder & Lead Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/company/kopern"
tags: ["engineering", "architecture", "nextjs", "firebase", "open-source"]
image: "/blog/building_kopern/starting.jpeg"
locale: "en"
---

## The Starting Point

![Kopern: From Zero to 121 Features in 3 Weeks](/blog/building_kopern/starting.jpeg)

In early March 2026, I started building Kopern with a simple question: why is it so hard to build, test, and deploy a production-grade AI agent? The market was full of agent builders, but none offered the complete loop — build, grade, optimize, deploy, and monitor — in a single platform.

Three weeks later, Kopern had 77 features shipped (Phase 1 complete on March 25), and by April 6, that number hit 121. This is the story of how we got there, what broke along the way, and the architectural bets that paid off.

## The Stack

We went with **Next.js 16** (App Router), **React 19**, **TypeScript strict**, and **Firebase** (Firestore + Auth). For the UI layer: **shadcn/ui**, **Radix UI**, **Tailwind CSS 4**, and **Framer Motion 12**. Billing runs on **Stripe** with usage-based meters. The LLM layer supports four providers natively: Anthropic, OpenAI, Google, and Mistral — all with streaming tool calling.

The key bet was going serverless-first on Vercel. No custom backend, no VPS, no Kubernetes. Every API route is a Vercel function. This choice had consequences — both good and bad.

## Phase 1: The Studio (March 6-25)

Phase 1 was about building the core platform. Agent CRUD, a chat playground with SSE streaming, custom tool execution in a sandboxed VM, a grading engine with 6 evaluation criteria, and the AutoResearch lab with 6 optimization modes (AutoTune, AutoFix, Stress Lab, Tournament, Distillation, Evolution).

The grading engine is where Kopern differentiates. Most platforms let you build an agent and hope for the best. Kopern grades your agent against adversarial test cases, identifies weaknesses, and auto-patches the system prompt. The **AutoFix** pipeline is fully autonomous: one click generates a test suite, runs the grading, analyzes failures, and patches the prompt. Non-technical users never see the complexity.

### The 88 Euro Disaster

![Kopern: The 88 Euro Disaster](/blog/building_kopern/88_euros.jpeg)

The biggest incident happened early: an outbound webhook loop that cost 88 euros and crashed the database. The webhook system fired an outbound call on every agent response. When an inbound webhook triggered an agent, the response fired an outbound webhook, which could trigger another inbound... infinite loop.

The fix was a **triple protection layer**:

1. `skipOutboundWebhooks: true` on all non-Playground callsites (17 routes audited)
2. `isSelfCallUrl()` blocks outbound calls to Kopern domains
3. Inbound webhook routes always force `skipOutboundWebhooks: true`

This incident shaped our entire security philosophy. We treat anti-loop protection as a first-class concern, not an afterthought.

### API Keys: A Deliberate Decision

Unlike most SaaS platforms, Kopern stores zero LLM API keys in environment variables. Users bring their own keys, stored encrypted in Firestore. Vercel only has infrastructure keys (Stripe, Firebase, Slack). This means:

- Zero LLM cost for us on user workloads
- Users control their own rate limits and billing
- Failover: up to 5 keys per provider with automatic rotation on 429 errors

The key rotation system uses an in-memory cooldown cache. When a key hits a rate limit, it's cooled down for 60 seconds and the next key is tried. If all keys are in cooldown, we try anyway — better than failing.

## Phase 2: Infrastructure at Scale (March 26 - April 6)

![Kopern: Scale](/blog/building_kopern/scale.jpeg)

Phase 2 brought the features that make Kopern production-ready.

### Connectors: 5 Deployment Channels

Agents needed to live outside the dashboard. We built connectors for:

- **Embeddable Widget**: Shadow DOM isolation, SSE streaming, markdown rendering, CORS, mobile responsive
- **Webhooks**: HMAC-SHA256 signed, compatible with n8n, Zapier, and Make out of the box
- **Slack Bot**: OAuth flow, Events API, thread support, custom mrkdwn converter
- **Telegram Bot**: Bot API via webhook, HTML parse_mode (not MarkdownV2 — it breaks on tables)
- **WhatsApp**: Meta Cloud API with webhook verification

Each connector uses Vercel's `after()` function for async processing — we learned the hard way that fire-and-forget async calls get killed in serverless environments.

### Service Connectors: Calendar + Email as Agent Tools

This was a game-changer. OAuth with Google and Microsoft gives agents access to 8 tools: send/reply/read emails and list/create/update/cancel events plus availability checks. Tokens are encrypted with AES-256-GCM. Daily limits (20 emails, 10 events) prevent runaway loops. All write operations require tool approval (EU AI Act Article 14 compliance).

### Visual Orchestration with React Flow

Multi-agent teams needed a visual editor. We chose React Flow v12 — the same library powering n8n and Flowise. Four custom node types (Agent, Condition, Trigger, Output) with drag-and-drop composition, real-time status during execution, and bidirectional serialization to Firestore.

Teams support three execution modes: parallel (fan-out), sequential (chain), and conditional (router with branches). Each agent tracks its own token usage, cost, duration, and tool calls.

### The Agentic Engine Upgrade

On April 4, we did a major overhaul of the agent execution engine, inspired by patterns from production systems:

- **Parallel tool execution**: Read-only tools run via `Promise.all`, writes stay sequential
- **Micro-compaction**: Old tool results replaced by `[Previous tool output cleared]`, last 3 preserved
- **Content budget**: Tool results over 100K characters get truncated (full result saved in Firestore)
- **Reactive compact + retry**: On `prompt_too_long` errors, auto-compact and retry (circuit breaker at 1x)
- **Prompt cache preservation**: Anthropic system prompt sent as array with `cache_control: { type: "ephemeral" }` — ~90% cost reduction on repeated calls

We also killed a "diminishing returns" detector that was terminating agents too early. It measured output token delta, but tools like `web_fetch` and `code_interpreter` produce near-zero text tokens while doing real work. Replacing it with a simple `maxIterations` (configurable 1-30, default 10) was more predictable and reliable.

![Kopern: The 121 Features](/blog/building_kopern/121_features.jpeg)

## The Numbers

| Metric | Value |
|--------|-------|
| Features shipped | 121 |
| API routes | 40+ |
| MCP tools | 32 |
| Firestore collections | 15+ |
| npm package | @kopern/mcp-server v2.0.3 |
| i18n languages | 2 (EN/FR) |
| Templates | 37 (28 general + 9 vertical) |
| Builtin tools | 14 |
| Agent icons | 64 in 12 categories |
| Rate limiters | 8 |

## What We'd Do Differently

**Merge the navbars earlier.** We have three separate navigation bars (landing, pricing, public layout) that should be one shared component. It's tech debt we'll pay down, but it slowed feature additions.

**Start with JSON output from LLMs.** Our meta-create wizard originally parsed free-form markdown from the LLM using 500+ lines of regex. Every LLM variation (French labels, bullet vs numbered, bold vs plain) broke the parser. Switching to structured JSON output with `AgentSpec` schema validation was the right call — we should have done it from day one.

**Test webhook loops in staging.** The 88 euro incident was entirely preventable with an integration test that chains inbound → outbound → inbound.

## What's Next

The immediate focus is go-to-market. The platform is feature-complete for early adopters. We're running beta tests with an AI-specialized lawyer, building a public grader tool for top-of-funnel acquisition, and publishing our MCP server on every registry that will have us (npm, Smithery, Glama, and counting).

Phase 3 (January 2027) will bring a managed marketplace — think Shopify for AI agents. The plumber using Kopern won't know they're using Kopern.

The entire codebase is open-source at [github.com/berch-t/kopern](https://github.com/berch-t/kopern). Star it if you find it useful.
