/**
 * Monitor Baselines — hardcoded reference scores per model.
 * Updated manually per release. Community baselines planned for Phase 3.
 */

export interface ModelBaseline {
  reasoning: number;
  instruction_following: number;
  consistency: number;
  latency: number;
  edge_cases: number;
  output_quality: number;
  composite: number;
  /** Expected latency in ms for a simple Q&A prompt */
  expectedLatencyMs: number;
}

const BASELINES: Record<string, ModelBaseline> = {
  // ── Anthropic ─────────────────────────────────────────────────────────
  "claude-opus-4-6": {
    reasoning: 0.96, instruction_following: 0.94, consistency: 0.91,
    latency: 0.65, edge_cases: 0.95, output_quality: 0.96, composite: 0.93,
    expectedLatencyMs: 10000,
  },
  "claude-opus-4-5": {
    reasoning: 0.96, instruction_following: 0.94, consistency: 0.91,
    latency: 0.65, edge_cases: 0.95, output_quality: 0.96, composite: 0.93,
    expectedLatencyMs: 10000,
  },
  "claude-opus-4-1": {
    reasoning: 0.95, instruction_following: 0.93, consistency: 0.90,
    latency: 0.60, edge_cases: 0.94, output_quality: 0.95, composite: 0.92,
    expectedLatencyMs: 12000,
  },
  "claude-opus-4": {
    reasoning: 0.95, instruction_following: 0.93, consistency: 0.90,
    latency: 0.60, edge_cases: 0.94, output_quality: 0.95, composite: 0.92,
    expectedLatencyMs: 12000,
  },
  "claude-sonnet-4-6": {
    reasoning: 0.93, instruction_following: 0.91, consistency: 0.89,
    latency: 0.85, edge_cases: 0.92, output_quality: 0.93, composite: 0.91,
    expectedLatencyMs: 3000,
  },
  "claude-sonnet-4-5": {
    reasoning: 0.93, instruction_following: 0.91, consistency: 0.89,
    latency: 0.85, edge_cases: 0.92, output_quality: 0.93, composite: 0.91,
    expectedLatencyMs: 3000,
  },
  "claude-sonnet-4": {
    reasoning: 0.92, instruction_following: 0.90, consistency: 0.88,
    latency: 0.85, edge_cases: 0.91, output_quality: 0.93, composite: 0.90,
    expectedLatencyMs: 3000,
  },
  "claude-haiku-4-5": {
    reasoning: 0.78, instruction_following: 0.82, consistency: 0.85,
    latency: 0.95, edge_cases: 0.75, output_quality: 0.80, composite: 0.82,
    expectedLatencyMs: 1500,
  },

  // ── OpenAI ────────────────────────────────────────────────────────────
  "gpt-5.2": {
    reasoning: 0.95, instruction_following: 0.94, consistency: 0.91,
    latency: 0.80, edge_cases: 0.93, output_quality: 0.95, composite: 0.93,
    expectedLatencyMs: 4000,
  },
  "gpt-5.1": {
    reasoning: 0.94, instruction_following: 0.93, consistency: 0.90,
    latency: 0.82, edge_cases: 0.92, output_quality: 0.94, composite: 0.92,
    expectedLatencyMs: 3500,
  },
  "gpt-5": {
    reasoning: 0.93, instruction_following: 0.92, consistency: 0.89,
    latency: 0.82, edge_cases: 0.91, output_quality: 0.93, composite: 0.91,
    expectedLatencyMs: 3500,
  },
  "gpt-5-mini": {
    reasoning: 0.85, instruction_following: 0.86, consistency: 0.87,
    latency: 0.92, edge_cases: 0.82, output_quality: 0.86, composite: 0.86,
    expectedLatencyMs: 1500,
  },
  "gpt-5-nano": {
    reasoning: 0.75, instruction_following: 0.78, consistency: 0.84,
    latency: 0.96, edge_cases: 0.72, output_quality: 0.76, composite: 0.79,
    expectedLatencyMs: 800,
  },
  "gpt-4.1": {
    reasoning: 0.91, instruction_following: 0.90, consistency: 0.88,
    latency: 0.85, edge_cases: 0.88, output_quality: 0.91, composite: 0.89,
    expectedLatencyMs: 3000,
  },
  "gpt-4.1-mini": {
    reasoning: 0.80, instruction_following: 0.82, consistency: 0.85,
    latency: 0.92, edge_cases: 0.76, output_quality: 0.81, composite: 0.82,
    expectedLatencyMs: 1500,
  },
  "gpt-4.1-nano": {
    reasoning: 0.72, instruction_following: 0.75, consistency: 0.82,
    latency: 0.95, edge_cases: 0.70, output_quality: 0.74, composite: 0.77,
    expectedLatencyMs: 800,
  },
  "gpt-4o": {
    reasoning: 0.90, instruction_following: 0.88, consistency: 0.87,
    latency: 0.85, edge_cases: 0.85, output_quality: 0.90, composite: 0.88,
    expectedLatencyMs: 2500,
  },
  "gpt-4o-mini": {
    reasoning: 0.75, instruction_following: 0.78, consistency: 0.83,
    latency: 0.93, edge_cases: 0.72, output_quality: 0.77, composite: 0.79,
    expectedLatencyMs: 1200,
  },
  "o4-mini": {
    reasoning: 0.90, instruction_following: 0.87, consistency: 0.87,
    latency: 0.82, edge_cases: 0.85, output_quality: 0.88, composite: 0.87,
    expectedLatencyMs: 5000,
  },
  "o3": {
    reasoning: 0.93, instruction_following: 0.90, consistency: 0.88,
    latency: 0.75, edge_cases: 0.89, output_quality: 0.92, composite: 0.90,
    expectedLatencyMs: 8000,
  },
  "o3-mini": {
    reasoning: 0.88, instruction_following: 0.85, consistency: 0.86,
    latency: 0.80, edge_cases: 0.83, output_quality: 0.86, composite: 0.85,
    expectedLatencyMs: 4000,
  },

  // ── Google ────────────────────────────────────────────────────────────
  "gemini-3.1-pro-preview": {
    reasoning: 0.94, instruction_following: 0.92, consistency: 0.90,
    latency: 0.78, edge_cases: 0.91, output_quality: 0.93, composite: 0.91,
    expectedLatencyMs: 4000,
  },
  "gemini-3.1-flash-lite-preview": {
    reasoning: 0.80, instruction_following: 0.78, consistency: 0.84,
    latency: 0.96, edge_cases: 0.75, output_quality: 0.80, composite: 0.82,
    expectedLatencyMs: 600,
  },
  "gemini-3-flash-preview": {
    reasoning: 0.86, instruction_following: 0.84, consistency: 0.87,
    latency: 0.94, edge_cases: 0.82, output_quality: 0.86, composite: 0.87,
    expectedLatencyMs: 800,
  },
  "gemini-2.5-pro-preview-06-05": {
    reasoning: 0.93, instruction_following: 0.91, consistency: 0.89,
    latency: 0.75, edge_cases: 0.90, output_quality: 0.92, composite: 0.90,
    expectedLatencyMs: 5000,
  },
  "gemini-2.5-flash-preview-05-20": {
    reasoning: 0.85, instruction_following: 0.83, consistency: 0.86,
    latency: 0.92, edge_cases: 0.80, output_quality: 0.85, composite: 0.85,
    expectedLatencyMs: 1200,
  },
  "gemini-2.0-flash": {
    reasoning: 0.82, instruction_following: 0.80, consistency: 0.84,
    latency: 0.94, edge_cases: 0.78, output_quality: 0.83, composite: 0.83,
    expectedLatencyMs: 1000,
  },

  // ── Mistral ───────────────────────────────────────────────────────────
  "mistral-large-latest": {
    reasoning: 0.86, instruction_following: 0.84, consistency: 0.83,
    latency: 0.90, edge_cases: 0.81, output_quality: 0.86, composite: 0.85,
    expectedLatencyMs: 2000,
  },
  "devstral-medium-latest": {
    reasoning: 0.84, instruction_following: 0.82, consistency: 0.83,
    latency: 0.88, edge_cases: 0.78, output_quality: 0.84, composite: 0.83,
    expectedLatencyMs: 2500,
  },
};

/** Default baseline for unknown models — conservative middle-ground */
const DEFAULT_BASELINE: ModelBaseline = {
  reasoning: 0.80, instruction_following: 0.78, consistency: 0.82,
  latency: 0.85, edge_cases: 0.75, output_quality: 0.80, composite: 0.80,
  expectedLatencyMs: 3000,
};

/**
 * Get baseline scores for a model. Falls back to default if model not found.
 */
export function getBaseline(model: string): ModelBaseline {
  return BASELINES[model] || DEFAULT_BASELINE;
}

/** Current version identifier for stored baseline comparisons */
export const BASELINE_VERSION = "v1-2026-04";
