/** Token pricing per 1M tokens (USD) by provider */
export const PROVIDER_PRICING: Record<string, { input: number; output: number; label: string }> = {
  anthropic: { input: 3.0, output: 15.0, label: "Anthropic" },
  openai: { input: 2.5, output: 10.0, label: "OpenAI" },
  google: { input: 1.25, output: 5.0, label: "Google" },
  mistral: { input: 0.5, output: 1.5, label: "Mistral AI" },
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
  if (!text) return 0;
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
    autoresearchRunsPerMonth: 0,
    autoresearchMaxIterations: 0,
    githubIntegration: false,
    versionHistory: false,
    connectors: 1,
    widgetRemoveBranding: false,
    allowedModels: ["claude-sonnet-4-5-20250514", "claude-haiku-4-5-20251001"] as readonly string[],
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
    autoresearchRunsPerMonth: 5,
    autoresearchMaxIterations: 20,
    githubIntegration: true,
    versionHistory: true,
    connectors: 3,
    widgetRemoveBranding: true,
    allowedModels: null as readonly string[] | null, // all models
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
    autoresearchRunsPerMonth: Infinity,
    autoresearchMaxIterations: 100,
    githubIntegration: true,
    versionHistory: true,
    connectors: Infinity,
    widgetRemoveBranding: true,
    allowedModels: null as readonly string[] | null,
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
    autoresearchRunsPerMonth: Infinity,
    autoresearchMaxIterations: 500,
    githubIntegration: true,
    versionHistory: true,
    connectors: Infinity,
    widgetRemoveBranding: true,
    allowedModels: null as readonly string[] | null,
  },
} as const;

export type PlanTier = keyof typeof PLAN_LIMITS;

/** Kopern platform pricing (provider cost + 20% commission) */
export const KOPERN_PRICING = {
  inputTokensPer1M: 4.0,
  outputTokensPer1M: 20.0,
  gradingRunPrice: 0.15,
  autoresearchIterationPrice: 0.10,
  commissionRate: 0.2, // 20%
} as const;
