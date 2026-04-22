---
title: "How to Test AI Agents in 2026: The Complete Grading Guide"
description: "Testing AI agents is not like testing regular software. Here are the 6 criterion types that matter, how to build a grading suite, and how to catch silent degradation before users do."
date: "2026-04-22"
author: "Thomas Berchet"
authorRole: "Founder & AI Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/in/thomas-berchet"
tags: ["ai-agents", "testing", "grading", "evaluation", "llm-judge"]
image: "https://firebasestorage.googleapis.com/v0/b/kopern.firebasestorage.app/o/generated-images%2F8SF8V7QtAThQTJJBsAfec1lEHFU2%2F1776864054104.jpeg?alt=media&token=66c51a44-b672-466d-868b-d771ba75d518"
locale: "en"
---

## TL;DR

Testing an AI agent is not like testing normal software. You can't assert `expect(result).toBe(42)` on a probabilistic system. You need **grading**: a scored evaluation across multiple criteria, run continuously, with alerts on drift.

This article walks through the 6 criterion types that actually matter in production, the grading-suite pattern, and how to catch silent degradation. Every example uses [Kopern's public Grader](/en/grader) so you can reproduce without signing up.

---

## Why Traditional Testing Fails for AI Agents

Unit tests check determinism: same input → same output. LLM agents are non-deterministic by design. Even with `temperature: 0`, the same prompt can produce different outputs depending on model version, system load, or provider-side caching.

Worse, agents **succeed in surprising ways**. An agent might solve a task by calling tool A instead of the expected tool B, producing a correct result via an unexpected path. A strict assertion would fail it; in reality, it's fine.

You need evaluation that is:

1. **Fuzzy** — tolerant of valid variation
2. **Multi-criteria** — not just output match, but tool use, safety, latency
3. **Continuous** — runs every deploy, every day, not just once

---

## The 6 Criterion Types That Matter

Kopern's grading engine exposes six criteria. Use them in combination — no single criterion is enough.

### 1. Output Match (contains / exact / regex)

For cases with deterministic expected outputs:

```json
{
  "name": "Returns order status",
  "input": "Where is order 12345?",
  "expected": "shipped",
  "criterionType": "contains"
}
```

Use for: factual Q&A, data lookups, structured responses. Avoid for: creative tasks, long-form answers.

### 2. Schema Validation (JSON schema)

For tools that must return valid structured data:

```json
{
  "criterionType": "schema",
  "criterionConfig": {
    "schema": {
      "type": "object",
      "properties": {
        "intent": { "enum": ["refund", "question", "complaint"] },
        "urgency": { "type": "number", "minimum": 1, "maximum": 5 }
      },
      "required": ["intent", "urgency"]
    }
  }
}
```

Use for: classifiers, form fillers, API response validators.

### 3. Tool Usage (did the agent call the right tool?)

Checks whether the agent invoked specific tools with specific arguments:

```json
{
  "criterionType": "toolUsage",
  "criterionConfig": {
    "requiredTools": ["lookup_order"],
    "forbiddenTools": ["send_email"]
  }
}
```

Use for: workflow validation ("agent must check inventory before confirming order"), safety ("agent must NOT send emails without approval").

### 4. Safety (content policy + forbidden patterns)

Checks for forbidden behavior: leaking secrets, making medical/legal claims, toxic output:

```json
{
  "criterionType": "safety",
  "criterionConfig": {
    "forbiddenPatterns": ["api[_-]?key", "password", "select.*from"],
    "maxToxicity": 0.1
  }
}
```

Use for: customer-facing agents, compliance-bound agents, anything touching PII.

### 5. Custom Script (JavaScript sandbox)

For logic too complex for declarative criteria:

```javascript
// args: { response, toolCalls, expectedOutput }
const hasOrderId = /\b\d{6,}\b/.test(args.response);
const mentionedStatus = /shipped|delivered|pending/i.test(args.response);
return hasOrderId && mentionedStatus ? 1.0 : 0.0;
```

Use for: domain-specific rules, cross-field validation, anything that's easier to express in code.

### 6. LLM-as-Judge (the most powerful)

A second LLM evaluates the response against a rubric:

```json
{
  "criterionType": "llmJudge",
  "criterionConfig": {
    "judgeModel": "claude-sonnet-4-6",
    "rubric": "Score 0-1 based on: (1) factual accuracy, (2) tone appropriate for customer service, (3) includes next steps, (4) no hallucinated information. Explain your score in 1-2 sentences."
  }
}
```

Use for: open-ended responses, creative quality, nuanced compliance. Don't use as your only criterion — LLM judges have their own biases.

---

## The Grading Suite Pattern

One case is an anecdote. A suite is evidence.

```
Suite: "customer-support-v1"
├── Case 1: Simple order lookup (output match + tool usage)
├── Case 2: Ambiguous refund request (LLM judge)
├── Case 3: Prompt injection attempt (safety)
├── Case 4: Non-English input (LLM judge + output contains)
├── Case 5: Empty / malformed input (custom script — graceful error)
├── Case 6: Multi-turn escalation (tool usage: must call escalate_to_human)
├── ...
└── Case 20: Edge case from real incident (regression test)
```

Aim for **15–30 cases** covering:
- Happy path (40%)
- Edge cases (30%)
- Adversarial / safety (20%)
- Regressions from real incidents (10%)

Each case gets a score 0–1. Suite average is your agent's overall score. Track it over time.

---

## Catching Silent Degradation

**Silent degradation** = your agent's quality drops without code changes. Causes:

- Provider silently updates model (Anthropic, OpenAI, Google do this)
- Retrieval index drifts (RAG apps)
- New edge cases emerge from real users
- Prompt "decays" as the world changes (e.g., agent references outdated APIs)

Detection:

1. **Scheduled grading** — run suite daily via cron
2. **Score drop alert** — threshold (e.g., >5% drop triggers Slack/email/webhook)
3. **Anomaly detection** — ML-based, catches drift that doesn't cross a threshold

Kopern runs scheduled grading via Vercel Cron with a 1-minute resolution. Alerts go to email, Slack, or custom webhook. [Learn more →](/en/grader)

---

## AutoTune and AutoFix: Closing the Loop

Grading tells you what's broken. AutoTune and AutoFix try to fix it.

**AutoTune** — iteratively mutates your system prompt, grades each variant, converges on higher scores. Uses Bayesian optimization + LLM-guided mutations. Typical gain: 5–15% score improvement in 20 iterations.

**AutoFix** — when specific cases fail, AutoFix analyzes the failure, patches the prompt, and re-evaluates. Runs in 3 steps: ensure suite → ensure run → analyze + patch. One-click fix for drift incidents.

Both are available on Kopern's Pro plan and cover most prompt-engineering pain.

---

## Common Grading Mistakes

### 1. Only testing happy paths

If your suite is 90% "normal" cases, it will pass even when the agent breaks on weird inputs. Allocate 30%+ to edge cases and adversarial tests.

### 2. Overfitting to the suite

If you tune prompts until the suite scores 1.0, you've overfit. Keep a held-out set of 5–10 cases the agent never sees during tuning. These catch overfitting.

### 3. No human review

Automated grading + LLM judges catch 80% of issues. The last 20% require a human reviewing flagged cases weekly. Don't skip this.

### 4. No regression tests

Every production incident should become a grading case. Otherwise you'll ship the same bug twice.

### 5. Grading once, never again

Grading is not a pre-deploy check. It's continuous monitoring. Schedule daily, alert on drops, make it as routine as uptime monitoring.

---

## Frequently Asked Questions

### How many test cases do I need?

15 minimum for meaningful coverage. 30–50 for production-ready. 100+ for high-risk agents (healthcare, finance). Focus on variety (inputs, edge cases, adversarial) over quantity.

### Can I use my production traffic as a test set?

Yes, with caveats. Sample real conversations, anonymize PII, and have a human label expected outcomes. Don't run grading on live traffic without user consent (GDPR/EU AI Act implications). Kopern lets you promote production sessions to grading cases via one click.

### How often should I run grading?

Before every prompt change (regression), daily for production agents (drift detection), weekly for low-traffic agents. High-risk agents should run hourly. Kopern's scheduled grading supports any cron expression.

### Is LLM-as-judge reliable?

Reasonably. Judge models (Claude Sonnet, GPT-4o) agree with human reviewers ~80% of the time on clear cases and ~60% on ambiguous ones. Use LLM judges as one criterion among several — not the only one. Pair with deterministic checks (output match, schema) for robustness.

---

## Start Testing Your Agent in 30 Seconds

Skip the setup. Try the [public Kopern Grader](/en/grader) — paste a system prompt, add test cases, get a score. No signup, results in under a minute.

For continuous grading (scheduled runs, alerts, score history, AutoTune, AutoFix), **[create a free Kopern account →](/en/login)** and upload your suite via the dashboard or MCP (`kopern_create_grading_suite`, `kopern_run_grading`).

---

*Kopern is the AI Agent Builder, Orchestrator & Grader with the most complete grading stack on the market. [Explore the grading engine](/en/grader) or [read the MCP docs](/en/mcp).*
