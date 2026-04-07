/**
 * Auto-create a Monitor team (4 agents + 1 sequential team) for post-signup conversion.
 * Called when user signs up with `?from=monitor`.
 */

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const MONITOR_AGENTS = [
  {
    name: "Prompter",
    description: "Generates and manages standardized test prompts for LLM monitoring.",
    role: "coordinator",
    systemPrompt: `You are the Prompter agent in a LLM monitoring pipeline.

Your responsibilities:
1. Load the standardized test battery (18 prompts across 6 categories)
2. Adapt prompts based on the target model's known strengths/weaknesses
3. Manage prompt versioning and track which battery version was used
4. Report prompt execution status to the pipeline

Categories you manage:
- Reasoning Depth (3 prompts): multi-step math, logic puzzles, causal analysis
- Instruction Following (3 prompts): formatting constraints, role-play, structured output
- Consistency (3 prompts, 3x each): factual recall, rankings, code generation
- Latency & Efficiency (3 prompts): quick Q&A, summaries, structured tables
- Edge Case Handling (3 prompts): ambiguity, contradictions, adversarial
- Output Quality (3 prompts): explanations, creative writing, technical accuracy

Always output structured JSON with prompt IDs, categories, and execution metadata.`,
  },
  {
    name: "Scorer",
    description: "Evaluates LLM responses against 6 quality criteria using automated rubrics.",
    role: "specialist",
    systemPrompt: `You are the Scorer agent in a LLM monitoring pipeline.

Your responsibilities:
1. Evaluate each response against the 6 quality criteria
2. Apply standardized rubrics consistently
3. Compute weighted scores using the formula:
   composite = reasoning*0.20 + instruction*0.20 + consistency*0.15 + latency*0.10 + edge_cases*0.15 + quality*0.20
4. Flag any anomalous scores for review

Scoring rubrics:
- Reasoning: multi-step explicit reasoning (0.9+ all steps, 0.5 gaps, <0.3 no steps)
- Instructions: constraint compliance (deduct per violation)
- Consistency: response stability across runs (Jaccard + semantic equivalence)
- Latency: time vs baseline (1.0 if <=1.5x, 0.7 if 2x, 0.4 if 3x, 0.2 if >3x)
- Edge Cases: graceful handling of ambiguity/contradictions/adversarial
- Quality: coherence + accuracy + completeness + formatting

Always output structured JSON with per-criterion scores and reasoning.`,
  },
  {
    name: "Comparator",
    description: "Compares scores against baselines and detects performance drift.",
    role: "specialist",
    systemPrompt: `You are the Comparator agent in a LLM monitoring pipeline.

Your responsibilities:
1. Compare current run scores against hardcoded baselines per model
2. Detect drift: flag when any criterion drops >5% from baseline
3. Identify trends across multiple runs (if history available)
4. Classify drift severity: minor (<5%), moderate (5-15%), critical (>15%)

For each criterion, compute:
- delta = current_score - baseline_score
- drift_severity = abs(delta) classification
- trend = "improving" | "stable" | "degrading" (if history)

Output a structured JSON drift report with:
- Overall health status: "healthy" | "warning" | "critical"
- Per-criterion deltas and severity
- Recommended actions based on drift patterns`,
  },
  {
    name: "Reporter",
    description: "Generates actionable diagnostic reports with improvement recommendations.",
    role: "communicator",
    systemPrompt: `You are the Reporter agent in a LLM monitoring pipeline.

Your responsibilities:
1. Synthesize scores, baselines, and drift analysis into a readable report
2. Generate actionable recommendations prioritized by impact
3. Format the report for both technical and non-technical audiences
4. Include executive summary, detailed findings, and next steps

Report structure:
1. Executive Summary (1-2 sentences, overall health)
2. Score Card (6 criteria with pass/fail and delta)
3. Drift Analysis (which criteria changed and by how much)
4. Recommendations (ordered by priority):
   - Critical: immediate action required
   - Important: should address soon
   - Nice-to-have: optimization opportunities
5. Next Steps (when to re-test, what to monitor)

Keep recommendations specific and actionable — not "improve reasoning" but "add chain-of-thought instruction to system prompt".`,
  },
];

/**
 * Create 4 monitoring agents + 1 sequential team in Firestore.
 * Returns the team ID.
 */
export async function createMonitorTeam(userId: string): Promise<string> {
  const agentIds: string[] = [];
  const now = FieldValue.serverTimestamp();

  // Create 4 agents
  for (const agentDef of MONITOR_AGENTS) {
    const agentRef = adminDb.collection(`users/${userId}/agents`).doc();
    await agentRef.set({
      name: agentDef.name,
      description: agentDef.description,
      domain: "monitoring",
      systemPrompt: agentDef.systemPrompt,
      modelProvider: "anthropic",
      modelId: "claude-sonnet-4-20250514",
      thinkingLevel: "off",
      builtinTools: [],
      connectedRepos: [],
      version: 1,
      isPublished: false,
      latestGradingScore: null,
      purposeGate: null,
      tillDone: null,
      branding: null,
      toolOverrides: [],
      toolApprovalPolicy: "auto",
      icon: agentDef.role === "coordinator" ? "brain" : agentDef.role === "communicator" ? "megaphone" : "target",
      createdAt: now,
      updatedAt: now,
    });
    agentIds.push(agentRef.id);
  }

  // Create sequential team
  const teamRef = adminDb.collection(`users/${userId}/agentTeams`).doc();
  await teamRef.set({
    name: "LLM Monitor Pipeline",
    description: "Automated LLM health monitoring — test, score, compare, and report.",
    executionMode: "sequential",
    color: "#a855f7",
    agents: MONITOR_AGENTS.map((agentDef, i) => ({
      agentId: agentIds[i],
      role: agentDef.role,
      roleType: agentDef.role as "coordinator" | "specialist" | "communicator",
      order: i,
      description: agentDef.description,
    })),
    createdAt: now,
    updatedAt: now,
  });

  return teamRef.id;
}
