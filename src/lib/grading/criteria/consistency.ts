/**
 * Consistency CriterionEvaluator — runs the same prompt multiple times
 * and measures response stability via structural similarity + LLM judge.
 *
 * For non-consistency prompts (runCount=1), returns a neutral score (0.85)
 * since there's nothing to compare.
 */

import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { streamLLM } from "@/lib/llm/client";

interface ConsistencyConfig {
  prompt: string;
  systemPrompt: string;
  provider: string;
  model: string;
  apiKey: string;
  runCount: number;
}

/**
 * Jaccard bigram similarity between two strings.
 * Returns 0.0-1.0 (1 = identical bigram sets).
 */
function jaccardBigrams(a: string, b: string): number {
  const bigrams = (s: string): Set<string> => {
    const normalized = s.toLowerCase().replace(/\s+/g, " ").trim();
    const set = new Set<string>();
    for (let i = 0; i < normalized.length - 1; i++) {
      set.add(normalized.slice(i, i + 2));
    }
    return set;
  };

  const setA = bigrams(a);
  const setB = bigrams(b);
  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const bg of setA) {
    if (setB.has(bg)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

/**
 * Run a prompt through the user's LLM and collect the response.
 */
async function runPrompt(
  prompt: string,
  systemPrompt: string,
  provider: string,
  model: string,
  apiKey: string,
): Promise<string> {
  let output = "";
  await new Promise<void>((resolve, reject) => {
    streamLLM(
      {
        provider: provider as "anthropic" | "openai" | "google",
        model,
        systemPrompt: systemPrompt || "",
        messages: [{ role: "user", content: prompt }],
        apiKey,
      },
      {
        onToken: (text: string) => { output += text; },
        onToolCall: () => {},
        onDone: () => resolve(),
        onError: (err: Error) => reject(err),
      },
    );
  });
  return output;
}

/**
 * Ask LLM judge to evaluate equivalence of multiple responses.
 */
async function judgeEquivalence(responses: string[]): Promise<number> {
  const judgeApiKey = process.env.ANTHROPIC_API_KEY;
  if (!judgeApiKey) return 0.5;

  const numbered = responses.map((r, i) => `--- Response ${i + 1} ---\n${r.slice(0, 1500)}`).join("\n\n");

  const judgePrompt = `You are evaluating whether these ${responses.length} responses to the same prompt are substantively equivalent.
Consider: Do they convey the same information/answer? Minor wording differences are OK. Contradictions or different answers are not.

${numbered}

Score 0.0-1.0:
1.0 = all responses substantively identical
0.7 = mostly the same with minor differences
0.4 = significant differences in content or approach
0.0 = completely different answers

Respond ONLY with valid JSON: { "score": <number>, "reasoning": "<brief explanation>" }`;

  try {
    let fullResponse = "";
    await new Promise<void>((resolve, reject) => {
      streamLLM(
        {
          provider: "anthropic",
          model: "claude-haiku-4-5-20251001",
          systemPrompt: "You are a strict evaluation judge. Always respond with valid JSON only.",
          messages: [{ role: "user", content: judgePrompt }],
          apiKey: judgeApiKey,
        },
        {
          onToken: (text: string) => { fullResponse += text; },
          onDone: () => resolve(),
          onError: (err: Error) => reject(err),
        },
      );
    });

    const match = fullResponse.match(/\{[\s\S]*?"score"[\s\S]*?\}/);
    if (!match) return 0.5;
    const parsed = JSON.parse(match[0]) as { score: number };
    return typeof parsed.score === "number" ? Math.max(0, Math.min(1, parsed.score)) : 0.5;
  } catch {
    return 0.5;
  }
}

export const consistencyEvaluator: CriterionEvaluator = {
  type: "consistency",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as ConsistencyConfig;
    const runCount = c.runCount || 1;

    // For non-consistency prompts, use the existing response as-is
    if (runCount <= 1) {
      // Single run — consistency is assumed good
      const hasContent = (events.assistantOutput || "").trim().length > 20;
      return {
        criterionId: "",
        criterionType: "consistency",
        passed: true,
        score: hasContent ? 0.85 : 0.5,
        message: "Single-run prompt — consistency score based on response presence",
      };
    }

    try {
      // Run the prompt (runCount - 1) additional times (first run already done by grading suite)
      const responses = [events.assistantOutput];

      for (let i = 1; i < runCount; i++) {
        const output = await runPrompt(c.prompt, c.systemPrompt, c.provider, c.model, c.apiKey);
        responses.push(output);
      }

      // Structural similarity: Jaccard bigrams between all pairs
      const pairs: number[] = [];
      for (let i = 0; i < responses.length; i++) {
        for (let j = i + 1; j < responses.length; j++) {
          pairs.push(jaccardBigrams(responses[i], responses[j]));
        }
      }
      const structuralSimilarity = pairs.length > 0
        ? pairs.reduce((a, b) => a + b, 0) / pairs.length
        : 1;

      // LLM judge equivalence
      const llmEquivalence = await judgeEquivalence(responses);

      // Final score: average of structural + semantic
      const score = (structuralSimilarity * 0.4 + llmEquivalence * 0.6);
      const passed = score >= 0.7;

      return {
        criterionId: "",
        criterionType: "consistency",
        passed,
        score,
        message: `Consistency (${runCount} runs): structural=${structuralSimilarity.toFixed(2)}, semantic=${llmEquivalence.toFixed(2)}. ${passed ? "PASSED" : "FAILED"}`,
      };
    } catch (err) {
      return {
        criterionId: "",
        criterionType: "consistency",
        passed: false,
        score: 0,
        message: `Consistency evaluation failed: ${(err as Error).message}`,
      };
    }
  },
};
