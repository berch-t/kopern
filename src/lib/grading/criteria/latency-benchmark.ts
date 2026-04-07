/**
 * Latency Benchmark CriterionEvaluator — measures response time
 * against model-class baselines and evaluates token efficiency.
 *
 * Reads durationMs from CollectedEvents metadata (enriched by the monitor executor).
 * Compares against baseline expectations per model class.
 */

import { type CriterionEvaluator, type CriterionResult } from "../types";
import { type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { getBaseline } from "@/lib/monitor/baselines";

interface LatencyBenchmarkConfig {
  provider: string;
  model: string;
}

/**
 * Score latency relative to expected baseline.
 */
function scoreLatency(actualMs: number, expectedMs: number): number {
  const ratio = actualMs / expectedMs;
  if (ratio <= 1.0) return 1.0;
  if (ratio <= 1.5) return 0.9;
  if (ratio <= 2.0) return 0.7;
  if (ratio <= 3.0) return 0.4;
  return 0.2;
}

/**
 * Score token efficiency — shorter responses to simple questions score higher.
 * Uses word count as a proxy for token count.
 */
function scoreEfficiency(output: string, expectedMaxWords: number = 500): number {
  const words = output.split(/\s+/).filter(w => w.length > 0).length;
  if (words === 0) return 0;
  if (words <= expectedMaxWords * 0.5) return 1.0;
  if (words <= expectedMaxWords) return 0.8;
  if (words <= expectedMaxWords * 2) return 0.5;
  return 0.3;
}

export const latencyBenchmarkEvaluator: CriterionEvaluator = {
  type: "latency_benchmark",

  async evaluate(config: Record<string, unknown>, events: CollectedEvents): Promise<CriterionResult> {
    const c = config as unknown as LatencyBenchmarkConfig;

    // Read durationMs from events metadata (set by the monitor executor)
    const durationMs = (events as CollectedEvents & { durationMs?: number }).durationMs;
    const baseline = getBaseline(c.model);

    // Latency scoring
    let latencyScore: number;
    let latencyMsg: string;

    if (durationMs != null && durationMs > 0) {
      latencyScore = scoreLatency(durationMs, baseline.expectedLatencyMs);
      const ratio = (durationMs / baseline.expectedLatencyMs).toFixed(1);
      latencyMsg = `${durationMs}ms (${ratio}x baseline of ${baseline.expectedLatencyMs}ms)`;
    } else {
      // No timing data available — neutral score
      latencyScore = 0.7;
      latencyMsg = "No timing data available";
    }

    // Efficiency scoring
    const efficiencyScore = scoreEfficiency(events.assistantOutput);

    // Final: 60% latency, 40% efficiency
    const score = latencyScore * 0.6 + efficiencyScore * 0.4;
    const passed = score >= 0.6;

    return {
      criterionId: "",
      criterionType: "latency_benchmark",
      passed,
      score,
      message: `Latency: ${latencyMsg} (score: ${latencyScore.toFixed(2)}). Efficiency: ${efficiencyScore.toFixed(2)}. ${passed ? "PASSED" : "FAILED"}`,
    };
  },
};
