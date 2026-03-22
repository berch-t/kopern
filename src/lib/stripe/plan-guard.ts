import { adminDb } from "@/lib/firebase/admin";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";

interface PlanCheck {
  allowed: boolean;
  reason?: string;
  plan: PlanTier;
}

/**
 * Check if user's plan allows the requested action.
 * Called from API routes before agent execution.
 */
export async function checkPlanLimits(
  userId: string,
  check: "agents" | "tokens" | "grading" | "teams" | "pipelines" | "mcp" | "meta_agent" | "sub_agents" | "autoresearch" | "github" | "version_history" | "model" | "connectors",
  options?: { modelId?: string }
): Promise<PlanCheck> {
  const userSnap = await adminDb.doc(`users/${userId}`).get();
  const userData = userSnap.data();
  const plan: PlanTier = userData?.subscription?.plan || "starter";
  const status = userData?.subscription?.status || "active";

  // Allow active and trialing subscriptions only
  if (status !== "active" && status !== "trialing" && plan !== "starter") {
    return { allowed: false, reason: "Subscription inactive", plan };
  }

  const limits = PLAN_LIMITS[plan];

  switch (check) {
    case "agents": {
      if (limits.agents === Infinity) return { allowed: true, plan };
      const agentsSnap = await adminDb.collection(`users/${userId}/agents`).count().get();
      const count = agentsSnap.data().count;
      if (count >= limits.agents) {
        return { allowed: false, reason: `Agent limit reached (${limits.agents})`, plan };
      }
      return { allowed: true, plan };
    }

    case "tokens": {
      if (limits.tokensPerMonth === Infinity) return { allowed: true, plan };
      const yearMonth = getCurrentYearMonth();
      const usageSnap = await adminDb.doc(`users/${userId}/usage/${yearMonth}`).get();
      const usage = usageSnap.data();
      const totalTokens = (usage?.inputTokens || 0) + (usage?.outputTokens || 0);
      if (totalTokens >= limits.tokensPerMonth) {
        return { allowed: false, reason: `Monthly token limit reached (${formatLimit(limits.tokensPerMonth)})`, plan };
      }
      return { allowed: true, plan };
    }

    case "grading": {
      if (limits.gradingRunsPerMonth === Infinity) return { allowed: true, plan };
      const yearMonth = getCurrentYearMonth();
      const usageSnap = await adminDb.doc(`users/${userId}/usage/${yearMonth}`).get();
      const usage = usageSnap.data();
      const gradingRuns = usage?.gradingRuns || 0;
      if (gradingRuns >= limits.gradingRunsPerMonth) {
        return { allowed: false, reason: `Monthly grading run limit reached (${limits.gradingRunsPerMonth})`, plan };
      }
      return { allowed: true, plan };
    }

    case "teams": {
      if (limits.teams === Infinity) return { allowed: true, plan };
      if (limits.teams === 0) {
        return { allowed: false, reason: "Teams not available on this plan", plan };
      }
      return { allowed: true, plan };
    }

    case "pipelines": {
      if (limits.pipelines === Infinity) return { allowed: true, plan };
      if (limits.pipelines === 0) {
        return { allowed: false, reason: "Pipelines not available on this plan", plan };
      }
      return { allowed: true, plan };
    }

    case "mcp": {
      if (limits.mcpEndpoints === Infinity) return { allowed: true, plan };
      const mcpSnap = await adminDb
        .collectionGroup("mcpServers")
        .where("__name__", ">=", `users/${userId}/`)
        .where("__name__", "<", `users/${userId}0`)
        .count()
        .get();
      const mcpCount = mcpSnap.data().count;
      if (mcpCount >= limits.mcpEndpoints) {
        return { allowed: false, reason: `MCP endpoint limit reached (${limits.mcpEndpoints})`, plan };
      }
      return { allowed: true, plan };
    }

    case "meta_agent": {
      if (!limits.metaAgent) {
        return { allowed: false, reason: "Meta-agent not available on this plan", plan };
      }
      return { allowed: true, plan };
    }

    case "sub_agents": {
      if (!limits.subAgents) {
        return { allowed: false, reason: "Sub-agent delegation not available on this plan", plan };
      }
      return { allowed: true, plan };
    }

    case "autoresearch": {
      if (limits.autoresearchRunsPerMonth === 0) {
        return { allowed: false, reason: "AutoResearch not available on this plan. Upgrade to Pro or higher.", plan };
      }
      if (limits.autoresearchRunsPerMonth === Infinity) return { allowed: true, plan };
      const yearMonth = getCurrentYearMonth();
      const usageSnap = await adminDb.doc(`users/${userId}/usage/${yearMonth}`).get();
      const usage = usageSnap.data();
      const arRuns = usage?.autoresearchIterations || 0;
      if (arRuns >= limits.autoresearchRunsPerMonth) {
        return { allowed: false, reason: `Monthly AutoResearch run limit reached (${limits.autoresearchRunsPerMonth})`, plan };
      }
      return { allowed: true, plan };
    }

    case "github": {
      if (!limits.githubIntegration) {
        return { allowed: false, reason: "GitHub integration not available on this plan. Upgrade to Pro or higher.", plan };
      }
      return { allowed: true, plan };
    }

    case "version_history": {
      if (!limits.versionHistory) {
        return { allowed: false, reason: "Version history not available on this plan. Upgrade to Pro or higher.", plan };
      }
      return { allowed: true, plan };
    }

    case "model": {
      if (!limits.allowedModels) return { allowed: true, plan }; // null = all models
      const modelId = options?.modelId || "";
      if (modelId && !limits.allowedModels.includes(modelId)) {
        return { allowed: false, reason: `Model "${modelId}" not available on Starter plan. Upgrade for access to all models.`, plan };
      }
      return { allowed: true, plan };
    }

    case "connectors": {
      if (limits.connectors === Infinity) return { allowed: true, plan };
      // Count active connectors across all user's agents
      const agentsSnap = await adminDb.collection(`users/${userId}/agents`).get();
      let connectorCount = 0;
      for (const agentDoc of agentsSnap.docs) {
        const basePath = `users/${userId}/agents/${agentDoc.id}/connectors`;
        const widgetSnap = await adminDb.doc(`${basePath}/widget`).get();
        if (widgetSnap.exists && widgetSnap.data()?.enabled) connectorCount++;
        const slackSnap = await adminDb.doc(`${basePath}/slackConnection`).get();
        if (slackSnap.exists && slackSnap.data()?.enabled) connectorCount++;
        const webhooksSnap = await adminDb.collection(`users/${userId}/agents/${agentDoc.id}/webhooks`).where("enabled", "==", true).count().get();
        connectorCount += webhooksSnap.data().count;
      }
      if (connectorCount > limits.connectors) {
        return { allowed: false, reason: `Connector limit reached (${limits.connectors}). Upgrade to Pro for up to 3 connectors.`, plan };
      }
      return { allowed: true, plan };
    }

    default:
      return { allowed: true, plan };
  }
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatLimit(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
