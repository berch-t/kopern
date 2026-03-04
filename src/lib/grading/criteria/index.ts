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
  const evaluator = evaluators[criterion.type];
  if (!evaluator) {
    return {
      criterionId: criterion.id,
      criterionType: criterion.type,
      passed: false,
      score: 0,
      message: `Unknown criterion type: ${criterion.type}`,
    };
  }

  const result = await evaluator.evaluate(criterion.config, events);
  return {
    ...result,
    criterionId: criterion.id,
  };
}

export async function evaluateAllCriteria(
  criteria: CriterionConfig[],
  events: CollectedEvents
): Promise<{ results: CriterionResult[]; score: number; passed: boolean }> {
  const results: CriterionResult[] = [];

  for (const criterion of criteria) {
    const result = await evaluateCriterion(criterion, events);
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
