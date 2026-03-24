import type { PlanTier } from "@/lib/billing/pricing";

// ---------------------------------------------------------------------------
// Kopern commission: 17% markup on LLM provider costs
// Covers: agentic tool execution & sandboxing, session observability & tracing,
// grading engine (6 criteria), Optimization Lab (6 modes), multi-provider
// abstraction, security (HMAC, CORS, API key encryption), connectors
// (Widget/Webhook/Slack/MCP), CSV/JSON data export, real-time Firestore sync
// ---------------------------------------------------------------------------
export const KOPERN_COMMISSION_RATE = 0.17; // 17%

// Kopern's billed price per 1M tokens (provider cost + 17% commission)
export const KOPERN_USAGE_PRICING = {
  inputTokensPer1M: 3.90,   // ~$3.33 provider avg + $0.57 commission
  outputTokensPer1M: 19.50, // ~$16.67 provider avg + $2.83 commission
  gradingRunPrice: 0.14,    // ~$0.12 cost + $0.02 commission
} as const;

// ---------------------------------------------------------------------------
// Stripe Price IDs — set via env vars, configured in Stripe Dashboard
// ---------------------------------------------------------------------------
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL!,
  enterprise_monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!,
  enterprise_annual: process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL!,
  // Metered prices for usage-based plan
  usage_input_tokens: process.env.STRIPE_PRICE_USAGE_INPUT!,
  usage_output_tokens: process.env.STRIPE_PRICE_USAGE_OUTPUT!,
  usage_grading_runs: process.env.STRIPE_PRICE_USAGE_GRADING!,
} as const;

// ---------------------------------------------------------------------------
// Plan → Stripe Price mapping
// ---------------------------------------------------------------------------
export function getPriceId(
  plan: PlanTier,
  period: "monthly" | "annual"
): string | null {
  if (plan === "starter") return null; // Free
  if (plan === "pro") return period === "monthly" ? STRIPE_PRICES.pro_monthly : STRIPE_PRICES.pro_annual;
  if (plan === "enterprise") return period === "monthly" ? STRIPE_PRICES.enterprise_monthly : STRIPE_PRICES.enterprise_annual;
  // "usage" plan uses metered billing — checkout with all 3 metered prices
  return null;
}

export function getUsageMeteredPriceIds(): string[] {
  return [
    STRIPE_PRICES.usage_input_tokens,
    STRIPE_PRICES.usage_output_tokens,
    STRIPE_PRICES.usage_grading_runs,
  ];
}

// ---------------------------------------------------------------------------
// Stripe → Plan tier reverse mapping (from webhook product metadata)
// ---------------------------------------------------------------------------
export const PLAN_FROM_PRODUCT_META: Record<string, PlanTier> = {
  pro: "pro",
  enterprise: "enterprise",
  usage: "usage",
};
