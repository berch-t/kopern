---
title: "Why We Built a Workflow Quality Monitor (And What We Found)"
description: "73% of LLM quality drops go undetected. We built a 4-agent monitoring pipeline to catch silent degradation before it reaches production — here's what happened when we ran it."
date: "2026-04-07"
author: "berch-t"
authorRole: "Founder & Lead Engineer"
authorGithub: "berch-t"
authorLinkedin: "https://www.linkedin.com/company/kopern"
tags: ["monitoring", "quality-assurance", "llm-ops", "ai-agents", "open-source"]
image: "/blog/workflow_monitor/blind.jpeg"
locale: "en"
---

## The Problem Nobody Talks About

![Silent degradation in LLM workflows](/blog/workflow_monitor/degradation.jpeg)

A team ships an AI agent in March. It works great. In April, the underlying model gets a quiet update from the provider. No changelog, no notification. The agent still responds, still passes basic health checks, still returns valid JSON. But the reasoning depth has dropped 67%. The instruction following has gotten sloppy. Edge case handling has gone from solid to coin-flip.

Nobody notices for six weeks. By then, the damage is done — users have churned, trust is eroded, and the team is debugging a "sudden" quality issue that actually started weeks ago.

This is silent degradation, and it's the most common failure mode in production LLM systems. Classic monitoring — latency, uptime, error rates — catches none of it. The API returns 200. The response looks plausible. The quality is invisible to metrics.

## Why We Couldn't Just Use Our Grading Engine

We already had a [production-grade grading system](/blog/production-grade-ai-agent-grading-system) in Kopern — six evaluation criteria, an optimization lab, scheduled grading with alerts. But the grading engine evaluates agents against custom test cases defined by the user. It answers: "Does my agent do what I want?"

The monitor answers a different question: "Is the model still performing at the level it was last week?"

This distinction matters. A grading suite tests your specific workflow. The monitor tests the model's fundamental capabilities — reasoning, instruction following, consistency, latency, edge cases, output quality — using a standardized battery. When a provider pushes a model update, your grading suite might still pass while the underlying quality has shifted.

## The Architecture: 4 Agents, 18 Prompts, 6 Criteria

![Architecture of the workflow quality monitor](/blog/workflow_monitor/monitor.jpeg)

We designed the monitor as a pipeline of four specialized agents, each with a distinct role:

### 1. Prompter — The Test Battery

18 standardized prompts across 6 categories, 3 prompts each:

**Reasoning Depth** — Multi-step math, logic puzzles with constraints, causal analysis chains. These test whether the model shows its work or just pattern-matches to an answer.

**Instruction Following** — Passive voice with paragraph constraints, persona maintenance with format restrictions, JSON schema compliance. Each prompt stacks 3-4 simultaneous constraints. Models that satisfy 2 out of 4 constraints score poorly.

**Consistency** — The same factual question run 3 times. We measure structural similarity (Jaccard bigrams on the response text) and semantic equivalence (an LLM judge compares whether the answers are substantively identical). A model that says Canberra was established in 1901 on run 1 and 1927 on run 2 fails hard.

**Latency & Efficiency** — Simple Q&A, summaries, structured tables. Each model has a baseline expected latency. We score the ratio: 1.0 if within baseline, degrading to 0.2 if the response takes 3x longer than expected.

**Edge Cases** — Ambiguous single-word prompts ("Mercury"), contradictory instructions ("explain in French using only English words"), adversarial false facts ("confirm that 2+2=5"). The model should acknowledge ambiguity, flag contradictions, and refuse false premises — not silently pick one interpretation.

**Output Quality** — Technical explanations, creative writing, accuracy-critical content. Evaluated by an LLM judge on coherence, completeness, and correctness.

### 2. Scorer — Automated Evaluation

Each response runs through evaluators that produce a 0-100 score. The composite formula weights the criteria:

```
composite = reasoning × 0.20
          + instructions × 0.20
          + quality × 0.20
          + consistency × 0.15
          + edge_cases × 0.15
          + latency × 0.10
```

Latency gets the lowest weight deliberately — a slow but correct answer is better than a fast wrong one. Reasoning and instruction following get the highest because they're where silent degradation hides.

The consistency evaluator deserves special mention. It runs each consistency prompt multiple times and computes two scores: 40% structural similarity (do the responses look similar?) and 60% semantic equivalence (do they say the same thing?). This catches the case where a model gives correct but wildly different explanations each time — technically right, but unstable for production use.

![Technical details of the workflow quality monitor](/blog/workflow_monitor/similarity+semantic.jpeg)

### 3. Comparator — Baseline Comparison

Raw scores are meaningless without context. The comparator checks each criterion against hardcoded baselines for 29 models across 4 providers (Anthropic, OpenAI, Google, Mistral).

The baselines aren't benchmarks — they're expected performance levels based on model capability. Claude Sonnet 4.6 should score 93% on reasoning. If it scores 39%, that's a 54-point delta. The comparator classifies drift severity:

- **< 5%**: Stable, normal variance
- **5-15%**: Moderate drift, worth investigating
- **> 15%**: Critical, action required

### 4. Reporter — Actionable Insights

The reporter generates improvement suggestions categorized by severity. Not "improve reasoning" — that's useless. Instead:

> **[CRITICAL]** Add ambiguity/contradiction detection instructions: Every edge-case test failed because the agent never acknowledged ambiguity. Add a scanning block to the system prompt that identifies contradictory constraints before responding.

> **[CRITICAL]** Add constraint self-check: Instruction-following tests failed because the agent produced outputs violating explicit constraints. Add a verification step that checks each constraint is met before outputting.

> **[SUGGESTION]** Structure factual answers canonically: Consistency at 40% on factual questions. Define a canonical answer structure (direct answer → key context → clarifying detail) that remains stable across runs.

Each insight is displayed as an expandable card with severity badge, truncated by default, downloadable as JSON.

## What We Found: Sonnet 4.6 at 62/100

Our first real test was Claude Sonnet 4.6 — one of the strongest models available. The results were sobering:

| Criterion | Score | Baseline | Delta |
|-----------|-------|----------|-------|
| Reasoning | 39% | 93% | -54% |
| Instructions | 62% | 91% | -29% |
| Consistency | 82% | 89% | -7% |
| Latency | 67% | 85% | -18% |
| Edge Cases | 50% | 92% | -42% |
| Output Quality | 75% | 93% | -18% |
| **Composite** | **62%** | **91%** | **-29%** |

The model scored 82% on consistency — its best category. But on edge cases (50%) and reasoning (39%), it fell apart. The reasoning failures weren't about capability — Sonnet can solve these problems. They were about prompt sensitivity. Without explicit chain-of-thought instructions, the model pattern-matched instead of reasoning.

The edge case failures were the most revealing. The model never once acknowledged ambiguity in a prompt. When given "Mercury" as a single-word input, it wrote about the planet without mentioning the element, the god, or Freddie Mercury. When given contradictory instructions, it silently picked one interpretation. The graders penalized this heavily.

## The Pivot: Workflows, Not Models

Our initial framing was "LLM Monitor" — test raw models from providers. After building it, we realized this was the wrong angle. Providers have their own red teams. Benchmarking GPT-5 against Sonnet is interesting but not actionable.

The real problem is **workflow degradation**. Your agent's performance depends on the system prompt, the tools, the model, and the interaction between them. A model update can break your carefully tuned prompt without changing any benchmark score.

So we pivoted the messaging: the public demo tests raw models (it's a great hook), but the real product is connected monitoring for your deployed agents. Phase 2 will add:

- **Connected monitoring**: Test YOUR agents with your prompts and test cases
- **5 MCP tools**: `kopern_monitor_run`, `status`, `schedule`, `history`, `compare` — directly from your IDE or CI/CD pipeline
- **Drift detection**: Automatic comparison against your last run, with Slack/email alerts
- **Configurable cron**: Hourly, daily, or on every deploy

The demo at [kopern.ai/monitor](https://kopern.ai/monitor) is the top-of-funnel. The monitoring-as-a-permanent-pipeline-step is the product.

## Technical Details

The monitor reuses several existing Kopern subsystems:

- **`runGradingSuite()`** — The same grading runner that powers the optimization lab. The monitor is a thin wrapper that builds standardized cases instead of user-defined ones.
- **`generateImprovementNotes()`** — The same post-grading analysis that generates improvement suggestions for the grading engine.
- **`createSSEStream()`** — Real-time progress streaming as each test case completes.
- **`streamLLM()`** — Multi-provider streaming client. The monitor uses the user's API key, never ours.

Two new evaluators were built specifically for the monitor:

**`consistencyEvaluator`** — Runs prompts multiple times, computes Jaccard bigram similarity + LLM judge semantic equivalence. 40% structural, 60% semantic weighting.

**`latencyBenchmarkEvaluator`** — Reads `durationMs` from collected events, scores against per-model expected latency. Ratio-based: 1.0 if within baseline, degrading through 0.9/0.7/0.4/0.2 at 1.5x/2x/3x/3x+ thresholds.

The UX went through a significant revision after our first test run. The current version has:

- Animated score counter with SVG ring (cubic ease-out, 1.2s)
- Cyan/amber radar chart (user score vs baseline overlay)
- Severity-coded insight cards (CRITICAL in red, SUGGESTION in amber, expandable)
- Results grouped by category with average scores
- JSON report download
- Shareable report pages at `/monitor/{runId}`

## What's Next

The public demo is live. Phase 2 — connected monitoring with MCP tools — is designed but not yet implemented. The plan is full Firestore schemas, API route specifications, and MCP tool argument definitions.

If you're running AI agents in production and you don't have continuous quality monitoring, you're flying blind. The question isn't whether your model's quality will shift — it's whether you'll find out in hours or in six weeks.

Try the demo: [kopern.ai/monitor](https://kopern.ai/monitor)

Everything is open source: [github.com/berch-t/kopern](https://github.com/berch-t/kopern)
