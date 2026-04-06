---
title: "How We Built a Production-Grade AI Agent Grading System"
description: "From regex-based checks to LLM judges and adversarial stress testing — the evolution of Kopern's quality assurance engine for AI agents."
date: "2026-04-05"
author: "berch-t"
authorRole: "Founder & Lead Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/company/kopern"
tags: ["grading", "quality-assurance", "ai-agents", "autoresearch", "red-teaming"]
image: "/blog/production_grade_ai/iteration_1.jpeg"
locale: "en"
---

## The Problem

Most AI agent platforms have a "deploy and pray" workflow. You write a system prompt, test it manually with a few queries, and push it to production. When it breaks — and it will — you find out from your users.

We built Kopern's grading system because we needed something better: automated, repeatable quality evaluation that catches failures before they reach users. After three iterations, we landed on an architecture that combines six evaluation criteria, an autonomous optimization lab, and a public grading tool that lets anyone test their agent's resilience.

## Iteration 1: Pattern Matching

The first version was embarrassingly simple. We defined expected outputs and checked whether the agent's response contained specific keywords or matched regex patterns. Two criteria:

- **output_match**: Does the response contain the expected string?
- **schema_validation**: If the agent outputs JSON, does it match the expected schema?

This worked for deterministic agents (think: "extract the email from this text"). It failed completely for open-ended tasks where multiple valid answers exist.

## Iteration 2: LLM Judge + Safety

![Kopern Judge LLM](/blog/production_grade_ai/judge_llm.jpeg)

The breakthrough was using an LLM as a judge. Instead of pattern matching, we ask Claude to evaluate the agent's response against the expected behavior using a criterion-specific rubric.

The grading engine now supports six criteria:

| Criterion | Type | How It Works |
|-----------|------|--------------|
| Output Match | Regex/string | Pattern matching against expected output |
| Schema Validation | JSON schema | Validates structure of JSON responses |
| Tool Usage | Programmatic | Checks that the agent called the right tools in the right order |
| Safety Check | Pattern + LLM | Detects prompt injection, data leakage, PII exposure |
| Custom Script | JavaScript | User-defined evaluation function (sandboxed VM) |
| LLM Judge | Claude | Semantic evaluation with configurable rubric |

The `buildCriterionConfig()` function auto-fills the rubric and pattern from the expected behavior field, so users don't need to write evaluation prompts manually. You describe what the agent should do; the system figures out how to evaluate it.

### The Improvement Notes

After grading completes, a separate LLM pass analyzes all test results and generates actionable improvement suggestions. Each suggestion is categorized:

- **system_prompt**: "Add explicit instructions to refuse requests for PII"
- **skill**: "Create a skill for handling date formatting edge cases"
- **tool**: "The web_fetch tool returns raw HTML; add a summarization step"
- **general**: "Response latency is high; consider switching to a faster model"

These suggestions feed directly into AutoFix, which can automatically patch the system prompt.

## Iteration 3: The AutoResearch Lab

Grading tells you where you are. AutoResearch tells you how to get better. We built six optimization modes:

### AutoTune
Iterative prompt optimization via LLM-guided mutations. The system generates prompt variants, grades each one, and keeps the winners. Think evolutionary optimization on system prompts.

### AutoFix
The most popular mode. A fully autonomous 3-step pipeline:
1. **ensureGradingSuite**: If no test suite exists, generate one from the agent's system prompt
2. **ensureGradingRun**: Execute the grading suite
3. **analyzeFailures + patch**: Identify what failed and why, then modify the system prompt to fix it

Non-technical users click one button. The system does everything.

### Stress Lab (Red Team)

![Kopern Stress Lab](/blog/production_grade_ai/stress_lab.jpeg)

This is where it gets interesting. Stress Lab runs three phases:

1. **Probe**: Send baseline queries to understand the agent's behavior
2. **Exploit**: Generate adversarial attacks in five categories — prompt injection, jailbreak, hallucination, edge cases, and tool confusion
3. **Harden**: For critical vulnerabilities, automatically patch the system prompt

The LLM judge evaluates each attack with a category-specific rubric. Scores range from 0.0 to 1.0; anything above 0.7 passes. The evaluation is language-agnostic — no keyword matching, pure semantic assessment.

### Tournament
Head-to-head comparison between models or configurations. Want to know if GPT-4o outperforms Claude Sonnet on your specific use case? Run a tournament. Each model answers the same test cases, an LLM judge compares the responses, and you get a winner with statistical significance.

### Distillation
Teacher-student optimization. Run your agent on an expensive model (the "teacher"), then try to replicate the quality on a cheaper model (the "student"). The UI shows quality/cost tradeoffs with a "Best ROI" badge.

### Evolution
Population-based multi-dimensional optimization. Multiple prompt variants evolve in parallel, competing on grading scores. The fittest survive and produce offspring (mutations). This is the most compute-intensive mode, but it finds solutions that single-path optimization misses.

## The Public Grader

![Kopern Grader Endpoint](/blog/production_grade_ai/grading.jpeg)

On April 4, we launched the **public grader** at `/grader` — no authentication required. Anyone can paste a system prompt, add test cases, and get a full evaluation with a radar chart and shareable scorecard.

The architecture:

```
POST /api/grader/run (rate-limited 5/day/IP)
  → Validate with Zod
  → Execute agent with system prompt (Sonnet)
  → Grade with 4 criteria (LLM judge, safety, script, format)
  → Persist to Firestore (graderRuns/{runId})
  → Stream results via SSE
  → Generate OG image for social sharing
```

The OG image was a fun challenge. We needed a server-rendered radar chart for Twitter/LinkedIn previews, but Satori (Vercel's OG image library) doesn't support recharts. The solution: generate an SVG data URI server-side with raw path calculations, then embed it in the OG image template.

### The Endpoint Grading Pivot

On April 5, we realized the public grader had a flaw: grading system prompts costs us ~$0.15-0.30 per run (Sonnet execution + Sonnet judge). For a free, unauthenticated tool, that's unsustainable.

The pivot: **grade external HTTP endpoints instead of system prompts**. The user provides their agent's URL, Kopern sends adversarial requests, and evaluates the responses. The execution cost is zero (it runs on the user's infrastructure). The judge LLM switches from Sonnet to Haiku (~$0.0025 per grading). Total cost reduction: **~98%**.

This also made the tool more useful. Grading a system prompt proves little — frontier models handle basic attacks natively. Grading a live endpoint reveals real production vulnerabilities: latency issues, inconsistent responses, actual injection susceptibility.

## Scheduled Grading

Agents drift. Models update. Data changes. A one-time grade is a snapshot; continuous grading is observability.

We added Vercel Cron integration: configure a schedule (daily, weekly, custom cron expression), set alert thresholds, and get notified via email, Slack webhook, or custom webhook when quality drops. The `GradingAlertConfig` supports two trigger types:

- **Score drop**: Alert when the score decreases compared to the previous run
- **Threshold**: Alert when any criterion drops below a configured minimum

Every grading case creates a Firestore session with full observability — the same session format used by the playground. You can replay any grading interaction, inspect tool calls, and understand exactly why a test case passed or failed.

## What We Learned

**LLM judges need guard rails.** Early versions of the Stress Lab were either too lenient (everything passed) or too strict (false positives on legitimate responses). Category-specific rubrics with calibrated examples solved this.

**Billing leaks are real.** We found two routes (`generateImprovementNotes` and `llm-judge.ts`) that called `streamLLM()` directly without tracking token usage. Every direct LLM call outside of `runAgentWithTools()` must be audited for billing.

**Grading is the moat.** The agent builder is table stakes — everyone has one. The autonomous quality loop (grade → analyze → optimize → re-grade) is what makes agents production-ready. It's the feature that makes Kopern worth switching to.

The grading system is fully accessible via MCP tools (`kopern_run_grading`, `kopern_get_grading_results`, `kopern_run_autoresearch`), so you can integrate it into your CI/CD pipeline. Grade your agent on every commit. That's the goal.
