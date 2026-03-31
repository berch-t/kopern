import { adminDb } from "@/lib/firebase/admin";
import type { BudgetPolicy, BudgetWindow } from "@/lib/firebase/firestore";

/**
 * Get the total spend for a team within the budget window.
 * Uses the usage collection to aggregate costs.
 */
export async function getTeamSpend(
  userId: string,
  teamId: string,
  window: BudgetWindow,
): Promise<number> {
  const now = new Date();
  let yearMonth: string;

  switch (window) {
    case "daily": {
      // Sum today's cost from sessions
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const sessionsSnap = await adminDb
        .collectionGroup("sessions")
        .where("startedAt", ">=", todayStart)
        .get();
      let total = 0;
      for (const doc of sessionsSnap.docs) {
        if (doc.ref.path.includes(`users/${userId}/`)) {
          total += (doc.data().totalCost ?? 0) * 0.92; // USD to EUR
        }
      }
      return total;
    }
    case "weekly": {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
      weekStart.setHours(0, 0, 0, 0);
      const sessionsSnap = await adminDb
        .collectionGroup("sessions")
        .where("startedAt", ">=", weekStart)
        .get();
      let total = 0;
      for (const doc of sessionsSnap.docs) {
        if (doc.ref.path.includes(`users/${userId}/`)) {
          total += (doc.data().totalCost ?? 0) * 0.92;
        }
      }
      return total;
    }
    case "monthly":
    default: {
      yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const usageSnap = await adminDb.doc(`users/${userId}/usage/${yearMonth}`).get();
      if (!usageSnap.exists) return 0;
      const data = usageSnap.data();
      // Get team-specific cost from agentBreakdown
      const breakdown = data?.agentBreakdown as Record<string, { cost?: number }> | undefined;
      if (!breakdown) return 0;
      let total = 0;
      for (const [, agentData] of Object.entries(breakdown)) {
        total += (agentData.cost ?? 0) * 0.92;
      }
      return total;
    }
  }
}

/**
 * Check if execution is allowed under the budget policy.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkBudget(
  userId: string,
  teamId: string,
  policy: BudgetPolicy,
): Promise<{ allowed: boolean; reason?: string; currentSpend?: number }> {
  const spend = await getTeamSpend(userId, teamId, policy.window);

  if (spend >= policy.maxCostEUR) {
    return {
      allowed: false,
      reason: `Budget limit reached: ${spend.toFixed(2)}EUR / ${policy.maxCostEUR}EUR (${policy.window})`,
      currentSpend: spend,
    };
  }

  return { allowed: true, currentSpend: spend };
}
