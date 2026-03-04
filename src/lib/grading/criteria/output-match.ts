import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";

interface OutputMatchConfig {
  mode: "regex" | "contains" | "exact";
  pattern: string;
  flags?: string;
  caseSensitive?: boolean;
}

export const outputMatchEvaluator: CriterionEvaluator = {
  type: "output_match",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as OutputMatchConfig;
    const output = events.assistantOutput;
    let passed = false;
    let message = "";

    switch (c.mode) {
      case "exact": {
        const a = c.caseSensitive ? output : output.toLowerCase();
        const b = c.caseSensitive ? c.pattern : c.pattern.toLowerCase();
        passed = a.trim() === b.trim();
        message = passed ? "Exact match" : `Expected exact match with "${c.pattern}"`;
        break;
      }
      case "contains": {
        const a = c.caseSensitive ? output : output.toLowerCase();
        const b = c.caseSensitive ? c.pattern : c.pattern.toLowerCase();
        passed = a.includes(b);
        message = passed ? "Pattern found in output" : `Pattern "${c.pattern}" not found in output`;
        break;
      }
      case "regex": {
        try {
          const regex = new RegExp(c.pattern, c.flags || (c.caseSensitive ? "" : "i"));
          passed = regex.test(output);
          message = passed ? "Regex matched" : `Regex /${c.pattern}/ did not match`;
        } catch (err) {
          passed = false;
          message = `Invalid regex: ${(err as Error).message}`;
        }
        break;
      }
    }

    return {
      criterionId: "",
      criterionType: "output_match",
      passed,
      score: passed ? 1 : 0,
      message,
    };
  },
};
