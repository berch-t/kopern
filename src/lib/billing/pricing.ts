/** Default token pricing per 1M tokens (USD) by provider (fallback if model not found) */
export const PROVIDER_PRICING: Record<string, { input: number; output: number; label: string }> = {
  anthropic: { input: 3.0, output: 15.0, label: "Anthropic" },
  openai: { input: 2.5, output: 10.0, label: "OpenAI" },
  google: { input: 1.0, output: 10.0, label: "Google" },
  mistral: { input: 0.5, output: 1.5, label: "Mistral AI" },
  ollama: { input: 0, output: 0, label: "Ollama (Local)" },
};

/**
 * Per-model pricing overrides (USD per 1M tokens) — takes priority over provider default.
 * Source: https://docs.anthropic.com/en/docs/about-claude/pricing
 *         https://platform.openai.com/docs/pricing
 *         https://ai.google.dev/pricing
 *         https://docs.mistral.ai/getting-started/pricing/
 * Last verified: 2026-03-23
 */
export const MODEL_PRICING: Record<string, { input: number; output: number; name: string }> = {
  // ─── Anthropic ────────────────────────────────────────────────────
  "claude-opus-4-6":            { input:  5.0,  output: 25.0,  name: "Claude Opus 4.6" },
  "claude-opus-4-5-20250514":   { input:  5.0,  output: 25.0,  name: "Claude Opus 4.5" },
  "claude-sonnet-4-6":          { input:  3.0,  output: 15.0,  name: "Claude Sonnet 4.6" },
  "claude-sonnet-4-5-20250514": { input:  3.0,  output: 15.0,  name: "Claude Sonnet 4.5" },
  "claude-haiku-4-5-20251001":  { input:  1.0,  output:  5.0,  name: "Claude Haiku 4.5" },

  // ─── OpenAI ───────────────────────────────────────────────────────
  // GPT-5.x family (frontier, March 2026)
  "gpt-5.4":        { input:  2.50, output: 15.0,  name: "GPT-5.4" },
  "gpt-5.4-mini":   { input:  0.75, output:  4.50, name: "GPT-5.4 Mini" },
  "gpt-5.4-nano":   { input:  0.20, output:  1.25, name: "GPT-5.4 Nano" },
  "gpt-5.3-codex":  { input:  1.75, output: 14.0,  name: "GPT-5.3 Codex" },
  "gpt-5.3-chat":   { input:  1.75, output: 14.0,  name: "GPT-5.3 Chat" },
  "gpt-5.2":        { input:  0.875,output:  7.0,  name: "GPT-5.2" },
  "gpt-5.2-codex":  { input:  1.75, output: 14.0,  name: "GPT-5.2 Codex" },
  "gpt-5.1":        { input:  0.625,output:  5.0,  name: "GPT-5.1" },
  "gpt-5.1-codex":  { input:  1.25, output: 10.0,  name: "GPT-5.1 Codex" },
  "gpt-5":          { input:  0.625,output:  5.0,  name: "GPT-5" },
  "gpt-5-mini":     { input:  0.25, output:  2.0,  name: "GPT-5 Mini" },
  "gpt-5-nano":     { input:  0.05, output:  0.40, name: "GPT-5 Nano" },
  // GPT-4.x family
  "gpt-4o":         { input:  2.50, output: 10.0,  name: "GPT-4o" },
  "gpt-4o-mini":    { input:  0.15, output:  0.60, name: "GPT-4o Mini" },
  "gpt-4.1":        { input:  2.0,  output:  8.0,  name: "GPT-4.1" },
  "gpt-4.1-mini":   { input:  0.20, output:  0.80, name: "GPT-4.1 Mini" },
  "gpt-4.1-nano":   { input:  0.05, output:  0.20, name: "GPT-4.1 Nano" },
  // Reasoning models
  "o4-mini":        { input:  1.10, output:  4.40, name: "o4 Mini" },
  "o3":             { input:  2.0,  output:  8.0,  name: "o3" },
  "o3-mini":        { input:  1.10, output:  4.40, name: "o3 Mini" },

  // ─── Google ───────────────────────────────────────────────────────
  "gemini-2.5-pro":          { input: 1.0,  output: 10.0,  name: "Gemini 2.5 Pro" },
  "gemini-2.5-flash":        { input: 0.30, output:  2.50, name: "Gemini 2.5 Flash" },
  "gemini-2.5-flash-lite":   { input: 0.10, output:  0.40, name: "Gemini 2.5 Flash Lite" },
  "gemini-2.0-flash":        { input: 0.10, output:  0.40, name: "Gemini 2.0 Flash" },
  "gemini-2.0-flash-lite":   { input: 0.075,output:  0.30, name: "Gemini 2.0 Flash Lite" },

  // ─── Mistral ──────────────────────────────────────────────────────
  "mistral-large-latest":    { input: 0.50, output: 1.50, name: "Mistral Large 3" },
  "mistral-medium-latest":   { input: 0.40, output: 2.0,  name: "Mistral Medium 3.1" },
  "mistral-small-latest":    { input: 0.15, output: 0.60, name: "Mistral Small 4" },
  "magistral-medium-latest": { input: 2.0,  output: 5.0,  name: "Magistral Medium" },
  "codestral-latest":        { input: 0.30, output: 0.90, name: "Codestral" },
  "devstral-medium-latest":  { input: 0.40, output: 2.0,  name: "Devstral 2 Medium" },
  "devstral-small-latest":   { input: 0.07, output: 0.28, name: "Devstral Small 1.1" },
  "mistral-nemo-latest":     { input: 0.02, output: 0.04, name: "Mistral Nemo" },
};

/** Calculate cost for a given number of tokens, using per-model pricing when available.
 *  Applies the Kopern platform commission (17%) on top of provider costs. */
export function calculateTokenCost(
  provider: string,
  inputTokens: number,
  outputTokens: number,
  modelId?: string
): number {
  // Lazy import to avoid circular dependency
  const COMMISSION = 0.17;

  // Try per-model pricing first
  const modelPricing = modelId ? MODEL_PRICING[modelId] : undefined;
  if (modelPricing) {
    const raw = (inputTokens / 1_000_000) * modelPricing.input + (outputTokens / 1_000_000) * modelPricing.output;
    return raw * (1 + COMMISSION);
  }
  // Fallback to provider-level default
  const pricing = PROVIDER_PRICING[provider] ?? PROVIDER_PRICING.anthropic;
  const raw = (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
  return raw * (1 + COMMISSION);
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

// Kopern platform commission (17%) is applied in calculateTokenCost()
// Stripe metered pricing lives in @/lib/stripe/config.ts (KOPERN_USAGE_PRICING)
