import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { executeSandboxed } from "@/lib/sandbox/executor";

interface CustomScriptConfig {
  code: string;
}

export const customScriptEvaluator: CriterionEvaluator = {
  type: "custom_script",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as CustomScriptConfig;

    try {
      // Wrap the user code to receive events and return result
      const wrappedCode = `
        const output = args.output;
        const toolCalls = args.toolCalls;
        ${c.code}
      `;

      const resultStr = await executeSandboxed(wrappedCode, {
        output: events.assistantOutput,
        toolCalls: events.toolCalls,
      });

      let result: { passed: boolean; score: number; message: string };
      try {
        result = JSON.parse(resultStr);
      } catch {
        return {
          criterionId: "",
          criterionType: "custom_script",
          passed: false,
          score: 0,
          message: `Script did not return valid JSON: ${resultStr}`,
        };
      }

      return {
        criterionId: "",
        criterionType: "custom_script",
        passed: result.passed ?? false,
        score: result.score ?? (result.passed ? 1 : 0),
        message: result.message ?? "Custom script evaluation",
      };
    } catch (err) {
      return {
        criterionId: "",
        criterionType: "custom_script",
        passed: false,
        score: 0,
        message: `Script execution error: ${(err as Error).message}`,
      };
    }
  },
};
