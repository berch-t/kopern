import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";

interface OutputMatchConfig {
  mode: "regex" | "contains" | "exact";
  pattern: string | string[];
  flags?: string;
  caseSensitive?: boolean;
}

export const outputMatchEvaluator: CriterionEvaluator = {
  type: "output_match",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as OutputMatchConfig;
    const output = events.assistantOutput;

    // Normalize pattern to array
    const patterns = Array.isArray(c.pattern)
      ? c.pattern.filter(Boolean)
      : [c.pattern].filter(Boolean);

    if (patterns.length === 0) {
      return { criterionId: "", criterionType: "output_match", passed: false, score: 0, message: "No pattern specified" };
    }

    const failed: string[] = [];

    for (const pattern of patterns) {
      switch (c.mode) {
        case "exact": {
          const a = c.caseSensitive ? output : output.toLowerCase();
          const b = c.caseSensitive ? pattern : pattern.toLowerCase();
          if (a.trim() !== b.trim()) failed.push(pattern);
          break;
        }
        case "contains": {
          const a = c.caseSensitive ? output : output.toLowerCase();
          const b = c.caseSensitive ? pattern : pattern.toLowerCase();
          if (!a.includes(b)) failed.push(pattern);
          break;
        }
        case "regex": {
          try {
            const regex = new RegExp(pattern, c.flags || (c.caseSensitive ? "" : "i"));
            if (!regex.test(output)) failed.push(pattern);
          } catch (err) {
            failed.push(`${pattern} (invalid: ${(err as Error).message})`);
          }
          break;
        }
      }
    }

    const passed = failed.length === 0;
    const score = 1 - failed.length / patterns.length;
    const message = passed
      ? patterns.length === 1 ? "Pattern matched" : `All ${patterns.length} patterns matched`
      : `Failed patterns: ${failed.join(", ")}`;

    return { criterionId: "", criterionType: "output_match", passed, score, message };
  },
};
