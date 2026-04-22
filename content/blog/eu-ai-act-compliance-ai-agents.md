---
title: "EU AI Act Compliance for AI Agents: Your August 2, 2026 Checklist"
description: "Full EU AI Act enforcement starts August 2, 2026. Penalties hit €35M or 7% of revenue. Here's the concrete technical checklist for AI agents, and how Kopern handles Article 14 out of the box."
date: "2026-04-22"
author: "Thomas Berchet"
authorRole: "Founder & AI Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/in/thomas-berchet"
tags: ["eu-ai-act", "compliance", "ai-agents", "regulation", "governance"]
image: "https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864516931.jpeg?alt=media&token=2b8efaf9-b093-47cb-b0b4-428e1d856135"
locale: "en"
---

## TL;DR

**The EU AI Act becomes fully enforceable on August 2, 2026.** Penalties for non-compliance: €35M or 7% of global annual revenue, whichever is higher. Any AI agent serving EU users must provide technical documentation, human oversight, audit trails, and stop mechanisms.

This article turns legal text into a concrete technical checklist. Most of it can be automated — here's what Kopern ships to make compliance a toggle rather than a project.

---

## Who Does This Actually Apply To?

If you deploy AI agents that:

- Serve EU users (even from non-EU companies — GDPR-style extraterritoriality)
- Perform high-risk functions: credit scoring, employment screening, critical infrastructure, regulatory reporting, healthcare, education assessment

You are in scope. Low-risk agents (internal productivity, creative tools) have lighter obligations (transparency, documentation) but are still in scope.

**Practical check**: if your agent's decisions affect a person's rights, opportunities, or safety, assume high-risk.

---

## The Six Technical Obligations

### 1. Technical Documentation (Article 11)

Every high-risk AI system needs documentation covering:

- System purpose, capabilities, and limitations
- Training data sources (or for agents: foundation model provenance)
- Decision logic (system prompt, tool list, orchestration mode)
- Performance metrics and known failure modes
- Changes over time (versioning)

Kopern auto-versions agents (every system prompt change increments version) and ships a [compliance report generator](/en/dashboard) that exports Article 11 documentation as JSON/PDF.

### 2. Human Oversight (Article 14)

**This is where most teams will fail.** Article 14 requires:

- Humans can interpret and override system outputs
- Humans can stop or correct the system
- The system doesn't create over-reliance (automation bias)

Concretely: your agent needs a "pause button," approval gates on risky actions, and visibility into what the agent is doing in real time.

Kopern's **Tool Approval Policy** covers this:

- `auto` — no approval (low-risk actions only)
- `confirm_destructive` — approval before destructive tools (send email, delete, post publicly)
- `confirm_all` — approval on every tool call (high-risk agents)

Approval can be **interactive** (SSE in widget/playground) or **conversational** (Telegram / WhatsApp / Slack — user says "yes" to approve).

### 3. Audit Trails (Article 12)

Every inference must be logged with:

- Timestamp
- Input
- Output
- Tool calls made
- Decision path
- User / session identifier
- Retention: at least 6 months for high-risk systems

Kopern stores every conversation as a Firestore **session** with full event stream: messages, tool calls, approval decisions, errors, token usage. Sessions are queryable, exportable as CSV/JSON, and filterable by source.

### 4. Risk Management System (Article 9)

You need an ongoing risk assessment:

- Known risks
- Mitigation measures
- Residual risks
- Monitoring for new risks post-deployment

Kopern's **Stress Lab** runs adversarial testing (prompt injection, jailbreak, hallucination, tool confusion, edge cases) and auto-hardens prompts on critical/high vulnerabilities. Combined with [scheduled grading](/en/grader), you get continuous risk monitoring.

### 5. Accuracy and Robustness (Article 15)

Agents must perform consistently. You need:

- Baseline accuracy metrics
- Drift detection
- Regression testing on changes

Kopern's grading engine + AutoTune + AutoFix covers this. Schedule daily grading runs with score drop alerts (email, Slack, webhook) so you catch degradation immediately.

### 6. Transparency to Users (Article 13)

Users interacting with AI must be told. If your agent talks to customers, they need to know it's AI, not a human.

Kopern widgets ship with a configurable "AI Assistant" badge. Slack and Telegram bots identify themselves in bot profile. Webhooks include `x-kopern-agent-id` header.

---

![Kopern compliance timeline](https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864582514.jpeg?alt=media&token=2ee9ae3d-56df-4893-b69e-5f2b17640834)

## The Penalty Structure

Non-compliance penalties (whichever is **higher**):

| Violation | Penalty |
|---|---|
| Prohibited AI practices (Art. 5) | €35M or 7% global revenue |
| Non-compliance of high-risk AI | €15M or 3% global revenue |
| Incorrect/misleading info to authorities | €7.5M or 1% global revenue |

For a Series A startup with $50M ARR, that's $1.5M–$3.5M for a single documentation failure. For a Fortune 500, it's nine figures.

---

## The Compliance Timeline

| Date | What applies |
|---|---|
| Aug 1, 2024 | AI Act enters into force |
| Feb 2, 2025 | Prohibited AI systems banned (social scoring, emotional manipulation) |
| Aug 2, 2025 | GPAI model obligations active |
| **Aug 2, 2026** | **Full enforcement of high-risk AI rules** |
| Aug 2, 2027 | Some sector-specific extensions |

**You are now less than 4 months from full enforcement.** If you haven't started compliance, you're already behind.

---

## How Kopern Covers the Technical Requirements

| Obligation | Kopern feature |
|---|---|
| Art. 9 Risk management | Stress Lab + Scheduled grading + AutoFix |
| Art. 11 Technical documentation | Agent versioning + Compliance report generator |
| Art. 12 Audit trails | Firestore sessions with event stream |
| Art. 13 Transparency | Widget AI badge + Bot profile identification |
| Art. 14 Human oversight | Tool approval policy (3 modes) + Conversational approval |
| Art. 15 Accuracy | Grading engine + AutoTune + Drift alerts |

You still need organizational measures (policies, training, risk register, responsible AI officer in large orgs) — the Act requires both technical and governance controls. But the technical half is automated.

---

## The DIY Alternative

If you self-build on LangChain or CrewAI, you own:

- Building the audit trail logging pipeline
- Implementing approval gates per tool
- Writing the compliance documentation
- Running adversarial testing infrastructure
- Setting up scheduled grading with alerting

That's roughly 4–8 engineering weeks for a properly covered setup. Plus ongoing maintenance. Plus external audit prep.

Alternatively you use [Kopern](/en/login) (free tier covers compliance features) and focus on your actual business.

---

## Frequently Asked Questions

### Do I need EU AI Act compliance if I'm a US company?

Yes, if any EU user can access your service. The Act has extraterritorial reach (like GDPR). Even if your servers are in the US, serving an EU user triggers compliance obligations. Block EU traffic or comply — there is no third option.

### Is my low-risk AI agent exempt?

Mostly, but not entirely. Low-risk AI still has transparency obligations (users must know they're talking to AI) and documentation requirements. Watch out for scope creep — a "customer support" agent that starts handling refund approvals crosses into high-risk.

### What counts as "human oversight"?

A human must be able to: (1) understand what the agent decides and why, (2) override or stop it, (3) intervene in a reasonable time. For most agents, this means tool approval gates on risky actions + full conversation logs accessible to operators. Kopern covers both natively.

### How long do I need to retain AI agent logs?

Article 12 requires "at least the duration needed for their intended purpose" with a minimum expectation around 6 months for high-risk systems. Most teams retain 12–24 months for audit readiness. Kopern's Firestore storage is unlimited by default; you configure retention in your data governance policy.

---

## Ship Compliant Agents From Day One

EU AI Act compliance isn't a scramble if you start with the right platform. Kopern handles the technical requirements; you handle the business logic.

**[Start your free Kopern account →](/en/login)** — tool approval policies, session audit logs, compliance report generator included on every plan.

Already have agents in production? [Export them to Kopern via MCP](/en/mcp) with `kopern_import_agent` and get compliance coverage retroactively.

---

*Kopern is the AI Agent Builder, Orchestrator & Grader for EU AI Act-compliant deployments. [See full features](/en) or [read MCP docs](/en/mcp). This article is technical guidance, not legal advice — consult your counsel for your specific situation.*
