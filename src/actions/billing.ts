import { getDoc, setDoc, updateDoc } from "firebase/firestore";
import { usageDoc, type UsageDoc } from "@/lib/firebase/firestore";
import { MODEL_PRICING, PROVIDER_PRICING, calculateTokenCost } from "@/lib/billing/pricing";

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Token pricing per 1M tokens (USD) — re-export for billing page */
export const TOKEN_PRICING = PROVIDER_PRICING;

/** Per-model pricing — re-export for billing page */
export const PER_MODEL_PRICING = MODEL_PRICING;

/** Calculate cost with 17% Kopern commission (delegates to pricing.ts) */
export function calculateCost(
  provider: string,
  inputTokens: number,
  outputTokens: number
): number {
  return calculateTokenCost(provider, inputTokens, outputTokens);
}

export async function trackUsage(
  userId: string,
  agentId: string,
  provider: string,
  inputTokens: number,
  outputTokens: number
) {
  const yearMonth = getCurrentYearMonth();
  const ref = usageDoc(userId, yearMonth);
  const cost = calculateCost(provider, inputTokens, outputTokens);

  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    await setDoc(ref, {
      inputTokens,
      outputTokens,
      totalCost: cost,
      requestCount: 1,
      agentBreakdown: {
        [agentId]: { inputTokens, outputTokens, cost },
      },
    } as UsageDoc);
  } else {
    const existing = snapshot.data() as UsageDoc;
    const agentData = existing.agentBreakdown[agentId] ?? {
      inputTokens: 0,
      outputTokens: 0,
      cost: 0,
    };
    await updateDoc(ref, {
      inputTokens: existing.inputTokens + inputTokens,
      outputTokens: existing.outputTokens + outputTokens,
      totalCost: existing.totalCost + cost,
      requestCount: existing.requestCount + 1,
      [`agentBreakdown.${agentId}`]: {
        inputTokens: agentData.inputTokens + inputTokens,
        outputTokens: agentData.outputTokens + outputTokens,
        cost: agentData.cost + cost,
      },
    });
  }
}

export async function getUsage(userId: string, yearMonth?: string) {
  const ym = yearMonth ?? getCurrentYearMonth();
  const snapshot = await getDoc(usageDoc(userId, ym));
  if (!snapshot.exists()) return null;
  return { yearMonth: ym, ...snapshot.data() } as UsageDoc & { yearMonth: string };
}

export async function getUsageHistory(userId: string, months = 6) {
  const results: (UsageDoc & { yearMonth: string })[] = [];
  const now = new Date();

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const snapshot = await getDoc(usageDoc(userId, ym));
    if (snapshot.exists()) {
      results.push({ yearMonth: ym, ...snapshot.data() } as UsageDoc & { yearMonth: string });
    }
  }

  return results;
}
