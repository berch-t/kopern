import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";

interface ToolUsageConfig {
  expectedTools: string[];
  ordered: boolean;
  allowExtra: boolean;
}

export const toolUsageEvaluator: CriterionEvaluator = {
  type: "tool_usage",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as ToolUsageConfig;
    const expectedTools = Array.isArray(c.expectedTools) ? c.expectedTools : [];

    if (expectedTools.length === 0) {
      return { criterionId: "", criterionType: "tool_usage", passed: true, score: 1, message: "No expected tools specified — skipped" };
    }

    const actualTools = events.toolCalls.map((tc) => tc.name);

    // Check all expected tools were called
    const missing = expectedTools.filter((t) => !actualTools.includes(t));
    if (missing.length > 0) {
      return {
        criterionId: "",
        criterionType: "tool_usage",
        passed: false,
        score: 1 - missing.length / expectedTools.length,
        message: `Missing tool calls: ${missing.join(", ")}`,
      };
    }

    // Check no extra tools if not allowed
    if (!c.allowExtra) {
      const extra = actualTools.filter((t) => !expectedTools.includes(t));
      if (extra.length > 0) {
        return {
          criterionId: "",
          criterionType: "tool_usage",
          passed: false,
          score: 0.5,
          message: `Unexpected tool calls: ${extra.join(", ")}`,
        };
      }
    }

    // Check order if required
    if (c.ordered) {
      const filtered = actualTools.filter((t) => expectedTools.includes(t));
      let orderCorrect = true;
      let expectedIdx = 0;
      for (const tool of filtered) {
        if (tool === expectedTools[expectedIdx]) {
          expectedIdx++;
          if (expectedIdx >= expectedTools.length) break;
        }
      }
      orderCorrect = expectedIdx >= expectedTools.length;

      if (!orderCorrect) {
        return {
          criterionId: "",
          criterionType: "tool_usage",
          passed: false,
          score: 0.5,
          message: `Tool call order mismatch. Expected: ${expectedTools.join(" → ")}`,
        };
      }
    }

    return {
      criterionId: "",
      criterionType: "tool_usage",
      passed: true,
      score: 1,
      message: "All expected tools called correctly",
    };
  },
};
