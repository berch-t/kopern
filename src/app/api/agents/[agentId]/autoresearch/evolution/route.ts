export const maxDuration = 600;
import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";
import { runEvolution } from "@/lib/autoresearch/evolution";
import type { AutoResearchConfig, MutationDimension } from "@/lib/autoresearch/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = await request.json();
  const { userId, suiteId, maxIterations, targetScore, mutationDimensions } = body;

  if (!userId || !suiteId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const planCheck = await checkPlanLimits(userId, "autoresearch");
  if (!planCheck.allowed) {
    return NextResponse.json({ error: planCheck.reason, plan: planCheck.plan }, { status: 403 });
  }
  const tokenCheck = await checkPlanLimits(userId, "tokens");
  if (!tokenCheck.allowed) {
    return NextResponse.json({ error: tokenCheck.reason, plan: tokenCheck.plan }, { status: 403 });
  }

  const plan: PlanTier = planCheck.plan;
  const planLimits = PLAN_LIMITS[plan];
  const cappedIterations = Math.min(maxIterations || 20, planLimits.autoresearchMaxIterations);

  const config: AutoResearchConfig = {
    agentId,
    userId,
    suiteId,
    mode: "evolution",
    maxIterations: cappedIterations,
    targetScore: targetScore ?? undefined,
    mutationDimensions: (mutationDimensions as MutationDimension[]) || ["system_prompt", "model", "thinking_level"],
    strategy: "llm_guided",
  };

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      await runEvolution(config, {
        onStatus: (status) => send("status", { status }),
        onGeneration: (gen) => send("generation", gen),
        onResult: (result) => send("result", result),
        onError: (error) => send("error", { message: error.message }),
      });
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
