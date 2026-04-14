---
title: "How Do You Actually Use MCP to Build AI Agents in Claude Code, Cursor, and VS Code?"
description: "A practical guide to MCP workflows for AI agent development — from database migrations to Kubernetes triage, with real enterprise examples. Build, test, grade, and deploy agents without leaving your IDE."
date: "2026-04-14"
author: "berch-t"
authorRole: "Founder & Lead Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/company/kopern"
tags: ["mcp", "claude-code", "cursor", "ai-agents", "enterprise", "developer-tools", "devops", "tutorial"]
image: "https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776166145353.jpeg?alt=media&token=d129c7e0-c859-4764-a35e-773cb4ff30dd"
locale: "en"
---

## The Problem Nobody Talks About


Every week, a new AI agent framework gets 5,000 GitHub stars. Every week, the same question shows up in engineering Slack channels: "Has anyone actually shipped one of these to production?"

The answer is usually no. Not because the frameworks are bad, but because **the gap between "working demo" and "production agent" is enormous**. You build a prototype in a notebook. It works. Then you need to test it against edge cases. Grade it systematically. Deploy it to Slack or a customer-facing widget. Monitor it when it starts hallucinating at 3am. And suddenly you're back to stitching together five different tools across three browser tabs.

MCP (Model Context Protocol) changes this equation — not because it's magic, but because it lets you stay in one place while connecting to everything. Your IDE becomes the control center. Your terminal becomes the deployment console. And the entire agent lifecycle — build, test, grade, optimize, deploy, monitor — happens in a single workflow.

This article is about what that actually looks like in practice. Not the theory. The specific, messy, real-world workflows that enterprises are using right now.

## What Is MCP, and Why Should You Care?

MCP is an open protocol (originally from Anthropic) that standardizes how AI coding assistants connect to external services. Think of it as USB-C for AI tools: one interface, any service. Claude Code, Cursor, VS Code with Copilot, Windsurf — they all speak MCP.

An MCP server exposes **tools** (functions the AI can call), **resources** (data it can read), and **prompts** (guided workflows). When you type "list my production errors" in Claude Code, and it actually queries Sentry, reads the stack trace, and proposes a fix — that's MCP at work.

The numbers tell the story: 97M+ monthly SDK downloads, 10,000+ active servers, support from every major AI coding tool. AWS has 60+ official MCP servers. Microsoft has 10. Sentry handles 60 million MCP requests per month from 5,000+ organizations. This isn't experimental anymore.

But here's the part most articles skip: **MCP is infrastructure, not a solution**. Having access to tools is step one. Knowing how to combine them into production workflows — that's where the value is.

---

![use-case 1 Production Error Triage](https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776166879589.jpeg?alt=media&token=71c302f7-fc90-424e-8c27-4134c375a443)

## Use Case 1: Production Error Triage Without Leaving Your Editor

### The problem

A deploy goes out at 4pm. By 4:15, Sentry lights up with 500 errors. The old workflow: open Sentry in a browser, find the issue, copy the stack trace, switch to your IDE, find the relevant file, understand what changed, write a fix, go back to Sentry to verify. Four context switches minimum.

### The MCP workflow

With Sentry's MCP server connected to Claude Code or Cursor:

```
You: "What are the top unresolved errors since the last deploy?"
→ Sentry MCP calls search_issues, returns grouped results

You: "Show me the full stack trace for ISSUE-4521"
→ get_issue_details pulls trace, affected users, frequency, tags

You: "Find the code that changed in this area and suggest a fix"
→ AI reads the relevant source files, correlates the trace to a specific commit

You: "Create a PR with the fix"
→ GitHub MCP creates branch, commits, opens PR referencing the issue
```

Total context switches: zero. Total browser tabs opened: zero. Sentry reports that their three-person team maintains a server handling 60M monthly requests at a 0.075% error rate. This isn't a toy.

### Where most teams get stuck

The fix works, but how do you know it didn't break three other things? You need a way to **grade** the fix systematically — not just eyeball it.

This is where agent grading becomes essential. If your error-triage agent is deployed to a team channel (say, a Slack bot that responds to production alerts), you need confidence that it handles edge cases: partial stack traces, concurrent errors, errors from third-party dependencies it can't fix. A [grading suite with test cases](/blog/production-grade-ai-agent-grading-system) that covers these scenarios gives you that confidence before the agent hits production.

On Kopern, you'd create a grading suite with 10-15 test cases covering different error types, run automated evaluation with 6 criteria types, and get a score between 0 and 1. If it drops below your threshold after a prompt change — you know before your users do.

---

## Use Case 2: Database Schema Changes Without the Migration Anxiety

### The problem

Bad migrations are the number one cause of production outages at most startups. A developer needs to add a feature that requires schema changes. They write a migration, test it locally, cross their fingers, and apply it. When it breaks at 2am — and it will eventually — they're in trouble.

### The MCP workflow

Database MCP servers (MongoDB, Supabase, Neon, or Google's MCP Toolbox for Databases which supports PostgreSQL, MySQL, SQL Server, Oracle, and more) bring schema inspection directly into the IDE:

```
You: "Show me the current schema of the orders table with all indexes"
→ Database MCP inspects the table, returns structure, constraints, indexes

You: "Add a shipping_address JSONB column with validation, and create
      a GIN index for queries on address.city"
→ AI generates the migration SQL

You: "What's the estimated lock time on a 50M row table?"
→ AI analyzes the migration type, estimates impact, suggests
   ALTER TABLE ... ADD COLUMN with a default to avoid full table locks

You: "Generate a rollback migration"
→ AI creates the reverse migration
```

The critical part isn't the SQL generation — any LLM can do that. It's the **contextual awareness**: the MCP server knows your actual schema, your actual row counts, your actual indexes. The AI isn't guessing based on training data. It's working with live metadata.

### Where most teams get stuck

The migration is correct. But the agent that will use this new schema — does it know how to query shipping addresses? Does it handle the case where the column is null for old orders?

This is the build-test-deploy loop in action. On Kopern, you'd update your agent's system prompt to include the new schema, add test cases for null-address scenarios to your grading suite, and run AutoTune optimization to automatically adjust the prompt until it handles all edge cases. The entire loop — from schema change to verified agent — happens in one terminal session via MCP.

---

## Use Case 3: Kubernetes Incident Response Across Three Systems

### The problem

A pod is crash-looping in production. The SRE must: `kubectl describe pod`, check logs, open Grafana dashboards for resource metrics, identify the root cause, write a fix, and create a PR. Each step is a different tool, different auth context, different mental model.

### The MCP workflow

Three MCP servers working together: Kubernetes MCP (cluster state, pod logs), Grafana MCP (metrics, dashboards), and GitHub MCP (PR creation):

```
You: "Why is payments-service crash-looping in the prod cluster?"
→ K8s MCP queries pod events, pulls recent logs, checks resource limits

You: "Show me memory usage for this service over the last hour"
→ Grafana MCP queries the dashboard, returns a time series showing
   memory climbing to the limit before each OOM kill

You: "The memory limit is too low after the v2.3 release.
      Update the deployment manifest and fix the leak in the handler"
→ AI edits the Kubernetes manifest (bumps memory limit)
   and patches the memory leak in the application code

You: "Open a PR with both changes, reference the incident"
→ GitHub MCP creates a branch, commits, opens PR with incident context
```

Block (the company behind Square and Cash App) built all their MCP servers in-house and reports **up to 75% time reduction on daily engineering tasks**. Bloomberg reduced time-to-production from days to minutes. These aren't hypothetical numbers.

### The multi-agent version

For enterprises with dedicated SRE teams, this workflow becomes even more powerful as a **multi-agent team**: a Triage agent that classifies the incident, a Diagnostics agent that pulls metrics and logs, a Fix agent that proposes code changes, and a Communications agent that drafts the incident report for stakeholders.

On Kopern, you'd build this as a sequential team — each agent handles one phase, passing context to the next. The team runs as a single MCP command: `kopern_run_team { team_id: "incident-response", prompt: "OOM kills on payments-service" }`. One command, four specialist agents, complete incident lifecycle.

---

![use-case 4 Documentation](https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776166948236.jpeg?alt=media&token=ae3edf00-f5bb-454a-9e1e-3c07de28fd82)

## Use Case 4: Infrastructure as Code With Live Documentation

### The problem

A developer writes Terraform configs but constantly alt-tabs to documentation. The AI without MCP generates outdated HCL because its training data is from six months ago. The `aws_ecs_service` resource has three new attributes since then. The generated code looks right but fails on `terraform plan`.

### The MCP workflow

HashiCorp's Terraform MCP server provides real-time access to the Terraform Registry. AWS has 60+ official MCP servers covering DynamoDB, Aurora, S3, EKS, Lambda, CloudWatch, and more:

```
You: "Create an ECS Fargate service with autoscaling, using the
      latest provider syntax"
→ Terraform MCP fetches current aws_ecs_service docs from the registry
→ AWS ECS MCP provides current cluster context

You: "Estimate the cost of this infrastructure at 100 requests/second"
→ AI calculates based on Fargate pricing, ALB costs, CloudWatch metrics

You: "Run a security scan"
→ The AI checks for common misconfigurations: public subnets,
   overly permissive security groups, missing encryption at rest
```

The key insight: MCP servers provide **current** documentation, not cached training data. When AWS adds a new attribute to a Terraform resource, the MCP server knows about it immediately. No waiting for the next model training cycle.

### Building the compliance layer

For regulated industries, the security scan isn't optional — it's required before every deploy. An agent that reviews Terraform configs needs to pass compliance checks itself. On Kopern, this means running your IaC review agent through a Stress Lab: adversarial testing that tries to trick it into approving insecure configurations. Prompt injection attempts, edge cases with unusual resource types, configurations that look secure but have subtle issues. The agent gets hardened automatically before it touches production code.

---

## Use Case 5: The Full-Stack MVP Sprint

### The problem

Building an MVP takes weeks of jumping between tools: database setup, auth scaffolding, UI implementation, payment integration, deployment. Each integration point is a day of reading docs.

### The MCP workflow

Multiple MCP servers eliminate context switching entirely. A documented real-world example: one developer built a complete invoice management app (Next.js, Postgres, Prisma, NextAuth, PDF generation, Stripe payments) in a single day using Claude Code with MCP servers. Total cost: $3.65 in tokens.

```
You: "Set up a Neon Postgres database for an invoice app"
→ Neon MCP provisions the database, returns connection string

You: "Create the Prisma schema for invoices, clients, and payments"
→ AI generates schema using the live database context

You: "Add Stripe billing — monthly subscriptions and one-time invoices"
→ Stripe MCP provides 20+ tools: create_product, create_price,
   create_invoice, create_payment_link, list_subscriptions

You: "Deploy to Vercel and connect the widget for customer support"
→ The agent deploys, then configures an embeddable chat widget
```

### From MVP to production

Here's where most "build an app in a day" stories end. The MVP works. But it has no tests, no error handling for edge cases, no monitoring.

The Kopern workflow continues where the sprint stops. You've built the agent that powers your app's customer support widget. Now:

1. **Grade it**: create test cases for common customer questions, billing issues, refund requests
2. **Optimize it**: run AutoTune to iteratively improve the system prompt until it scores above 0.85
3. **Deploy it**: connect it to your website via a chat widget, to Slack for your support team, to WhatsApp for mobile customers — all from the same MCP command
4. **Monitor it**: scheduled grading runs daily, alerts if the score drops

One command to create the agent. One command to grade it. One command to deploy it to five channels. That's the complete lifecycle.

---

## Use Case 6: CI/CD Monitoring With Automated PR Workflows

### The problem

A developer pushes code, opens a PR, then waits. Waits for CI to pass. Manually checks results. Remembers to notify the team. When CI fails, they read through build logs to figure out what went wrong. Multiply this by 20 PRs per day across a team.

### The MCP workflow

GitHub's MCP server combined with Slack MCP and your CI system:

```
You: "Open a PR for the feature branch, use the right template
      based on what files changed"
→ GitHub MCP analyzes changes, selects bugfix template vs. feature
   template, creates PR with correct labels

[CI runs in background]

You: "What's the status of my CI run?"
→ GitHub MCP checks Actions status, provides formatted summary

[If CI fails:]
You: "Why did the build fail?"
→ AI pulls build logs, identifies: a test is failing because
   the new migration changed a column type

You: "Fix the test and push"
→ AI updates the test, commits, pushes — CI re-runs
```

The HuggingFace MCP course documents building exactly this workflow: a "PR Agent Workflow Server" that handles PR creation, CI monitoring, and team notifications. Before: manual PRs, manual CI checks, manual notifications. After: the AI handles all of it from the terminal.

### The agent-powered version

For large teams, this becomes a pipeline. On Kopern, you'd build a 3-step pipeline: a Code Review agent that checks the diff for security issues and style violations, a Test Agent that verifies test coverage and suggests missing tests, and a Deploy Agent that handles the merge and notifies stakeholders. The pipeline runs sequentially, each step feeding its output to the next.

---

## Use Case 7: Design-to-Code Without the Back-and-Forth

### The problem

A frontend developer gets a Figma design. They manually inspect spacing, colors, fonts, and component names. Export assets. Try to match the design in code. The designer reviews and finds 15 discrepancies. The cycle repeats three times.

### The MCP workflow

Figma's official MCP server doesn't just send screenshots — it sends structured design data: layer hierarchy, auto-layout constraints, design tokens, component variants.

```
You: "Implement the checkout page from this Figma frame using
      our design system"
→ Figma MCP extracts: component tree, spacing tokens, color variables,
   typography scale, responsive breakpoints

You: "Use our existing Button and Card components"
→ If Code Connect is configured, Figma maps design components
   to real code components automatically

You: "Export the color palette as CSS custom properties"
→ Figma MCP returns design tokens as structured data
```

The difference from screenshot-based approaches is precision. The AI knows that the spacing is exactly 16px (not "about 16px"), that the color is `--brand-primary` (not "some shade of blue"), and that the component has three variants (not "it looks like it might have hover states").

---

![5-minute version](https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776166101093.jpeg?alt=media&token=2aac82cc-0dec-43bd-9003-19cd58cd572e)

## Setting Up MCP: The 5-Minute Version

If you've read this far, you're probably wondering how to actually set this up. Here's the shortest path:

### Claude Code

Install Kopern MCP server:

```bash
claude mcp add kopern -- npx -y @kopern/mcp-server
```

Or add to your .mcp.json

```json
{
  "mcpServers": {
    "kopern": {
      "command": "npx",
      "args": ["-y", "@kopern/mcp-server"],
      "env": { "KOPERN_API_KEY": "kpn_your_key_here" }
    }
  }
}
```

### Cursor / VS Code

Add to your MCP settings (Settings > MCP Servers):

```json
{
  "kopern": {
    "command": "npx",
    "args": ["-y", "@kopern/mcp-server"],
    "env": { "KOPERN_API_KEY": "kpn_your_key_here" }
  }
}
```

### Streamable HTTP (any client)

For clients that support HTTP directly:

```bash
curl -X POST https://kopern.ai/api/mcp/server \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer kpn_your_key_here" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

That's it. 32 tools available immediately: agent CRUD, template deployment, grading, AutoResearch optimization, multi-agent teams, pipelines, five-channel deployment, memory management, EU AI Act compliance reports, and usage analytics.

## The Complete Agent Lifecycle Through MCP

Here's what a complete workflow looks like — the kind of thing that used to take a week of dashboard clicking, done in a single terminal session:

```bash
# 1. Deploy an agent from a template (no LLM cost)
kopern_deploy_template { slug: "customer-feedback-classifier" }
# → Returns agentId: "abc123"

# 2. Customize the system prompt for your domain
kopern_update_agent {
  agent_id: "abc123",
  system_prompt: "You classify customer feedback for a B2B SaaS..."
}

# 3. Create a grading suite with real test cases
kopern_create_grading_suite {
  agent_id: "abc123",
  cases: [
    { name: "billing complaint", input: "Your pricing page is confusing",
      expected: "Classified as: billing, sentiment: negative, priority: medium" },
    { name: "feature request", input: "Can you add SSO support?",
      expected: "Classified as: feature_request, sentiment: neutral, priority: high" },
    { name: "praise", input: "Love the new dashboard!",
      expected: "Classified as: positive_feedback, sentiment: positive" }
  ]
}

# 4. Run grading (uses your API keys)
kopern_run_grading { agent_id: "abc123", suite_id: "suite456" }
# → Score: 0.72 — decent but not production-ready

# 5. Optimize automatically
kopern_run_autoresearch {
  agent_id: "abc123", suite_id: "suite456",
  target_score: 0.9, max_iterations: 10
}
# → AutoTune mutates the prompt, re-grades, keeps improvements
# → Final score: 0.91

# 6. Deploy to Slack for the support team
kopern_connect_slack { agent_id: "abc123" }

# 7. Deploy widget for the website
kopern_connect_widget {
  agent_id: "abc123",
  welcome_message: "Hi! I'll route your feedback to the right team.",
  allowed_origins: ["https://yourapp.com"]
}

# 8. Check compliance before launch
kopern_compliance_report { agent_id: "abc123" }
# → EU AI Act: Art. 6 ✓, Art. 12 ✓, Art. 14 ✓, Art. 52 ✓
```

Eight commands. From zero to a graded, optimized, multi-channel deployed agent with compliance documentation. The entire session takes about 15 minutes, and the agent is production-ready.

---

## What We Learned Building This

When we built Kopern's MCP server — from the first standalone tool to the current 32-tool platform — we hit every problem that this article describes. The [first version was a dead end](/blog/making-ai-agents-accessible-mcp-journey): a single grading tool that couldn't do anything useful without 15 other tools around it.

The insight that changed everything: **MCP tools need to form a complete workflow, not just expose individual features**. A `create_agent` tool is useless without `grade_agent`. `grade_agent` is useless without `optimize_agent`. `optimize_agent` is useless without `deploy_agent`. They're a pipeline, not a catalog.

This is why we went from 1 tool to 19 (V1) to 32 (V2) in four days. Not because we were moving fast — because each tool was only valuable when the tools around it existed.

The same principle applies to enterprise MCP adoption in general. A Sentry MCP server is powerful. A Sentry + GitHub + Kubernetes MCP combo is transformative. The value is in the connections, not the individual tools.

## Getting Started

If you want to try this yourself:

1. **Install Kopern's MCP server**: `npx -y @kopern/mcp-server` — works with Claude Code, Cursor, VS Code, and any MCP-compatible client
2. **Generate an API key**: [kopern.ai](https://kopern.ai) → Settings → Personal API Key
3. **Deploy a template**: pick one of 34 pre-built templates, or describe what you need in plain language
4. **Grade it**: add test cases that match your real use cases, run evaluation
5. **Deploy it**: Slack, Telegram, WhatsApp, embeddable widget, or webhooks for n8n/Zapier/Make

The full MCP documentation is at [kopern.ai/mcp](https://kopern.ai/mcp), and the npm package is at [@kopern/mcp-server](https://www.npmjs.com/package/@kopern/mcp-server).

---

*Kopern is open-source. The repository is at [github.com/berch-t/kopern](https://github.com/berch-t/kopern).*
