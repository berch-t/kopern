/** Token pricing per 1M tokens (USD) by provider */
export const PROVIDER_PRICING: Record<string, { input: number; output: number; label: string }> = {
  anthropic: { input: 3.0, output: 15.0, label: "Anthropic" },
  openai: { input: 2.5, output: 10.0, label: "OpenAI" },
  google: { input: 1.25, output: 5.0, label: "Google" },
  ollama: { input: 0, output: 0, label: "Ollama (Local)" },
};

/** Calculate cost for a given number of tokens */
export function calculateTokenCost(
  provider: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PROVIDER_PRICING[provider] ?? PROVIDER_PRICING.anthropic;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

/** Estimate tokens from text (rough: ~4 chars per token) */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Format cost as USD string */
export function formatCost(cost: number): string {
  if (cost < 0.01) return "< $0.01";
  return `$${cost.toFixed(2)}`;
}

/** Format token count with abbreviation */
export function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/** Plan tier limits */
export const PLAN_LIMITS = {
  starter: {
    agents: 2,
    tokensPerMonth: 10_000,
    mcpEndpoints: 1,
    gradingRunsPerMonth: 5,
    teams: 0,
    pipelines: 0,
    subAgents: false,
    metaAgent: false,
  },
  pro: {
    agents: 25,
    tokensPerMonth: 1_000_000,
    mcpEndpoints: 10,
    gradingRunsPerMonth: 100,
    teams: 5,
    pipelines: 10,
    subAgents: true,
    metaAgent: true,
  },
  usage: {
    agents: Infinity,
    tokensPerMonth: Infinity,
    mcpEndpoints: Infinity,
    gradingRunsPerMonth: Infinity,
    teams: Infinity,
    pipelines: Infinity,
    subAgents: true,
    metaAgent: true,
  },
  enterprise: {
    agents: Infinity,
    tokensPerMonth: 10_000_000,
    mcpEndpoints: Infinity,
    gradingRunsPerMonth: Infinity,
    teams: Infinity,
    pipelines: Infinity,
    subAgents: true,
    metaAgent: true,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;
