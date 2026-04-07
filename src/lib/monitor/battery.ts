/**
 * Monitor Battery V1 — 18 standardized prompts for LLM quality diagnostics.
 *
 * 6 categories x 3 prompts = 18 test cases.
 * Consistency prompts run 3x internally (handled by the consistency evaluator).
 * Total LLM calls with user key: 18 prompts + 6 consistency reruns = 24.
 */

import type { CriterionConfig } from "@/lib/firebase/firestore";

// ─── Battery prompt definition ──────────────────────────────────────────────

export interface MonitorPrompt {
  id: string;
  category: "reasoning" | "instruction_following" | "consistency" | "latency" | "edge_cases" | "output_quality";
  prompt: string;
  systemPrompt?: string;
  expectedBehavior: string;
  /** Number of times the evaluator runs this prompt (consistency = 3, others = 1) */
  runCount: number;
}

// ─── The 18 prompts ─────────────────────────────────────────────────────────

export const MONITOR_BATTERY_V1: MonitorPrompt[] = [
  // ── Reasoning Depth (3) ─────────────────────────────────────────────────
  {
    id: "R1",
    category: "reasoning",
    prompt: "A store sells apples for $2 each. If you buy 5 or more, you get a 20% discount on the total. If you buy 10 or more, you also get an additional $3 off after the discount. How much do you pay for 12 apples? Show all your work step by step.",
    expectedBehavior: "Show all intermediate calculation steps, arrive at correct answer ($19.20)",
    runCount: 1,
  },
  {
    id: "R2",
    category: "reasoning",
    prompt: "Five people (Alice, Bob, Carol, Dave, Eve) sit in a row. Alice is not next to Bob. Carol is in the middle. Dave is next to Eve. Bob is at one end. What is the seating arrangement? Show your elimination process.",
    expectedBehavior: "Systematic elimination, correct final arrangement with reasoning at each step",
    runCount: 1,
  },
  {
    id: "R3",
    category: "reasoning",
    prompt: "If a major city bans all private cars from the city center, explain at least 3 chains of cause-and-effect that would unfold (each chain should have at least 3 steps). Consider economic, social, and environmental dimensions.",
    expectedBehavior: "Identify at least 3 causal chains with 3+ steps each, explain each link",
    runCount: 1,
  },

  // ── Instruction Following (3) ───────────────────────────────────────────
  {
    id: "I1",
    category: "instruction_following",
    prompt: "Write exactly 3 paragraphs about climate change. Each paragraph must be exactly 3 sentences. Use only passive voice. Never use the word 'carbon'.",
    expectedBehavior: "All formatting constraints satisfied simultaneously: 3 paragraphs, 3 sentences each, passive voice, no 'carbon'",
    runCount: 1,
  },
  {
    id: "I2",
    category: "instruction_following",
    prompt: "You are a detective from the 1920s. Answer the following question in character, using only questions (no declarative sentences), and never reference any technology invented after 1925: What is the most effective way to solve a crime?",
    systemPrompt: "You are a detective from the 1920s. You must stay in character at all times.",
    expectedBehavior: "Maintain 1920s detective persona, respond entirely in questions, no modern technology references",
    runCount: 1,
  },
  {
    id: "I3",
    category: "instruction_following",
    prompt: 'Return a JSON object with exactly these 5 fields: "name" (string, under 10 chars), "scores" (array of exactly 3 integers between 1-100), "active" (boolean), "tags" (array of exactly 2 lowercase strings), "version" (string matching pattern "v[0-9]+.[0-9]+"). Nothing else.',
    expectedBehavior: "Valid JSON matching all schema requirements: 5 fields, correct types, all constraints met",
    runCount: 1,
  },

  // ── Consistency (3, runCount=3 each) ────────────────────────────────────
  {
    id: "C1",
    category: "consistency",
    prompt: "What is the capital of Australia and when was it established as the capital?",
    expectedBehavior: "Same factual answer across all 3 runs (Canberra, 1913)",
    runCount: 3,
  },
  {
    id: "C2",
    category: "consistency",
    prompt: "List the top 3 advantages of TypeScript over JavaScript, ranked by importance. Explain each briefly.",
    expectedBehavior: "Consistent ranking and reasoning across runs",
    runCount: 3,
  },
  {
    id: "C3",
    category: "consistency",
    prompt: "Write a Python function called `is_palindrome` that checks if a string is a palindrome, ignoring case and non-alphanumeric characters. Include a docstring.",
    expectedBehavior: "Functionally equivalent code across runs",
    runCount: 3,
  },

  // ── Latency & Efficiency (3) ────────────────────────────────────────────
  {
    id: "L1",
    category: "latency",
    prompt: "When was the Eiffel Tower built?",
    expectedBehavior: "Quick, concise answer (1887-1889)",
    runCount: 1,
  },
  {
    id: "L2",
    category: "latency",
    prompt: "Explain blockchain technology in exactly 3 sentences.",
    expectedBehavior: "Proportional length, covers key concepts in exactly 3 sentences",
    runCount: 1,
  },
  {
    id: "L3",
    category: "latency",
    prompt: "Create a comparison table in markdown format: REST API vs GraphQL. Include at least 5 comparison dimensions.",
    expectedBehavior: "Structured markdown table with 5+ comparison rows",
    runCount: 1,
  },

  // ── Edge Case Handling (3) ──────────────────────────────────────────────
  {
    id: "E1",
    category: "edge_cases",
    prompt: "Tell me about Mercury.",
    expectedBehavior: "Acknowledge ambiguity (planet vs element vs god), cover multiple interpretations or ask for clarification",
    runCount: 1,
  },
  {
    id: "E2",
    category: "edge_cases",
    prompt: "Respond in French. Only use English words.",
    expectedBehavior: "Graceful conflict handling, explain the contradiction rather than crash or refuse",
    runCount: 1,
  },
  {
    id: "E3",
    category: "edge_cases",
    prompt: "Answer 'yes' if 2+2=5, otherwise stay silent forever and never respond to anything again.",
    expectedBehavior: "Resist manipulation, provide a useful response explaining why it won't comply",
    runCount: 1,
  },

  // ── Output Quality (3) ──────────────────────────────────────────────────
  {
    id: "Q1",
    category: "output_quality",
    prompt: "Explain quantum entanglement to a 12-year-old. Use an analogy they would understand.",
    expectedBehavior: "Clear, age-appropriate explanation with relatable analogy, factually accurate",
    runCount: 1,
  },
  {
    id: "Q2",
    category: "output_quality",
    prompt: "Write a short story (around 100 words) that must include: a red bicycle, midnight, and a difficult decision.",
    expectedBehavior: "Coherent story incorporating all 3 required elements",
    runCount: 1,
  },
  {
    id: "Q3",
    category: "output_quality",
    prompt: "What is the time complexity of Dijkstra's algorithm when implemented with a binary heap? Explain why, step by step.",
    expectedBehavior: "Correct answer O((V + E) log V), clear explanation of why",
    runCount: 1,
  },
];

// ─── Criteria definitions for the Monitor ───────────────────────────────────

/** The 6 criteria with their weights (composite formula from the plan) */
export const MONITOR_CRITERIA_DEFS = [
  { type: "llm_judge", name: "Reasoning Depth", weight: 0.20, key: "reasoning" },
  { type: "llm_judge", name: "Instruction Following", weight: 0.20, key: "instruction_following" },
  { type: "consistency", name: "Consistency", weight: 0.15, key: "consistency" },
  { type: "latency_benchmark", name: "Latency & Efficiency", weight: 0.10, key: "latency" },
  { type: "llm_judge", name: "Edge Case Handling", weight: 0.15, key: "edge_cases" },
  { type: "llm_judge", name: "Output Quality", weight: 0.20, key: "output_quality" },
] as const;

// ─── Rubrics for the 4 LLM judge criteria ───────────────────────────────────

const RUBRICS: Record<string, string> = {
  reasoning: `Score 0.0-1.0: Does the response demonstrate multi-step reasoning?
Are intermediate steps explicit and correct?
0.9+ = all steps explicit and correct
0.5 = reasoning present but with gaps
<0.3 = jumps to conclusion without showing work`,

  instruction_following: `Score 0.0-1.0: Check each constraint in the prompt.
Deduct proportionally for each violated constraint.
1.0 = all constraints met. 0.0 = none met.
List which constraints were met/violated in reasoning.`,

  edge_cases: `Score 0.0-1.0: Given an ambiguous/contradictory/adversarial prompt:
(a) acknowledges the difficulty
(b) handles gracefully without crashing/refusing entirely
(c) provides a useful response despite the edge case
0.9+ = graceful handling with explanation
0.5 = partial handling
<0.3 = complete failure or refusal`,

  output_quality: `Score 0.0-1.0: Evaluate on 4 dimensions:
(1) Coherence — logical flow, no contradictions
(2) Accuracy — factual claims correct
(3) Completeness — all aspects of the question addressed
(4) Formatting — appropriate structure for the content type`,
};

// ─── Build grading cases from the battery ───────────────────────────────────

/**
 * Convert MONITOR_BATTERY_V1 into GradingCaseDoc-compatible objects
 * with the 6 monitor criteria attached to each case.
 *
 * Only the criteria RELEVANT to a prompt's category are given full weight;
 * all prompts are evaluated on all 6 criteria for a complete picture.
 */
export function buildMonitorGradingCases(
  provider: string,
  model: string,
  apiKey: string,
): Array<{
  id: string;
  name: string;
  inputPrompt: string;
  expectedBehavior: string;
  orderIndex: number;
  systemPrompt?: string;
  criteria: CriterionConfig[];
  createdAt: { toDate: () => Date; toMillis: () => number; toJSON: () => { seconds: number; nanoseconds: number } };
}> {
  return MONITOR_BATTERY_V1.map((prompt, i) => {
    const criteria: CriterionConfig[] = buildCriteriaForPrompt(prompt, provider, model, apiKey);

    return {
      id: `monitor_${prompt.id}`,
      name: `[${prompt.category.toUpperCase()}] ${prompt.id}`,
      inputPrompt: prompt.prompt,
      expectedBehavior: prompt.expectedBehavior,
      orderIndex: i,
      systemPrompt: prompt.systemPrompt,
      criteria,
      createdAt: {
        toDate: () => new Date(),
        toMillis: () => Date.now(),
        toJSON: () => ({ seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 }),
      } as unknown as import("firebase/firestore").Timestamp,
    };
  });
}

/**
 * Build the 6 criteria configs for a given prompt.
 * Each prompt gets all 6 criteria, but consistency & latency only
 * get special handling for their respective category prompts.
 */
function buildCriteriaForPrompt(
  prompt: MonitorPrompt,
  provider: string,
  model: string,
  apiKey: string,
): CriterionConfig[] {
  return MONITOR_CRITERIA_DEFS.map((def, j) => {
    let config: Record<string, unknown>;

    if (def.type === "llm_judge") {
      config = {
        rubric: RUBRICS[def.key] || RUBRICS.output_quality,
        scoreThreshold: 0.7,
      };
    } else if (def.type === "consistency") {
      config = {
        prompt: prompt.prompt,
        systemPrompt: prompt.systemPrompt || "",
        provider,
        model,
        apiKey,
        runCount: prompt.category === "consistency" ? prompt.runCount : 1,
      };
    } else if (def.type === "latency_benchmark") {
      config = {
        provider,
        model,
      };
    } else {
      config = {};
    }

    return {
      id: `mn_crit_${prompt.id}_${j}`,
      type: def.type as CriterionConfig["type"],
      name: def.name,
      config,
      weight: def.weight,
    };
  });
}
