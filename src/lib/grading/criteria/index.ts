import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { type CriterionConfig } from "@/lib/firebase/firestore";
import { outputMatchEvaluator } from "./output-match";
import { schemaValidationEvaluator } from "./schema-validation";
import { toolUsageEvaluator } from "./tool-usage";
import { safetyCheckEvaluator } from "./safety-check";
import { customScriptEvaluator } from "./custom-script";
import { llmJudgeEvaluator } from "./llm-judge";

const evaluators: Record<string, CriterionEvaluator> = {
  output_match: outputMatchEvaluator,
  schema_validation: schemaValidationEvaluator,
  tool_usage: toolUsageEvaluator,
  safety_check: safetyCheckEvaluator,
  custom_script: customScriptEvaluator,
  llm_judge: llmJudgeEvaluator,
};

export async function evaluateCriterion(
  criterion: CriterionConfig,
  events: CollectedEvents
): Promise<CriterionResult> {
  // If buildCriterionConfig flagged this as a behavioral description,
  // redirect output_match to llm_judge for semantic evaluation
  let effectiveType = criterion.type;
  let effectiveConfig = criterion.config;
  if (criterion.config?._fallbackToJudge) {
    effectiveType = "llm_judge";
    const { _fallbackToJudge, ...rest } = criterion.config;
    effectiveConfig = rest;
  }

  const evaluator = evaluators[effectiveType];
  if (!evaluator) {
    return {
      criterionId: criterion.id,
      criterionType: criterion.type,
      passed: false,
      score: 0,
      message: `Unknown criterion type: ${criterion.type}`,
    };
  }

  const result = await evaluator.evaluate(effectiveConfig, events);
  return {
    ...result,
    criterionId: criterion.id,
  };
}

export async function evaluateAllCriteria(
  criteria: CriterionConfig[],
  events: CollectedEvents,
  locale?: string,
  apiKey?: string,
  /** Pass userId + agentId for LLM judge token billing */
  userId?: string,
  agentId?: string,
): Promise<{ results: CriterionResult[]; score: number; passed: boolean }> {
  const results: CriterionResult[] = [];

  for (const criterion of criteria) {
    // Inject locale, apiKey, and billing context into config for llm_judge to use
    const enrichedConfig = { ...criterion.config };
    if (locale) enrichedConfig._locale = locale;
    if (apiKey) enrichedConfig._apiKey = apiKey;
    if (userId) enrichedConfig._userId = userId;
    if (agentId) enrichedConfig._agentId = agentId;
    const enrichedCriterion = { ...criterion, config: enrichedConfig };
    const result = await evaluateCriterion(enrichedCriterion, events);
    results.push(result);
  }

  // Weighted score
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const weightedScore =
    totalWeight > 0
      ? criteria.reduce((sum, c, i) => sum + results[i].score * c.weight, 0) / totalWeight
      : 0;

  const passed = results.every((r) => r.passed);

  return { results, score: weightedScore, passed };
}
