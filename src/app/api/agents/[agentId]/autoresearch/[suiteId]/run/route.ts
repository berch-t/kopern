import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";
import { runAutoTune } from "@/lib/autoresearch/runner";
import type { AutoResearchConfig, MutationDimension, MutationStrategy } from "@/lib/autoresearch/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; suiteId: string }> }
) {
  const { agentId, suiteId } = await params;
  const body = await request.json();
  const { userId, mode, maxIterations, targetScore, maxTokenBudget, mutationDimensions, strategy } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // Enforce plan limits
  const planCheck = await checkPlanLimits(userId, "autoresearch");
  if (!planCheck.allowed) {
    return NextResponse.json(
      { error: planCheck.reason, plan: planCheck.plan },
      { status: 403 }
    );
  }
  const tokenCheck = await checkPlanLimits(userId, "tokens");
  if (!tokenCheck.allowed) {
    return NextResponse.json(
      { error: tokenCheck.reason, plan: tokenCheck.plan },
      { status: 403 }
    );
  }

  // Cap iterations based on plan
  const plan: PlanTier = planCheck.plan;
  const planLimits = PLAN_LIMITS[plan];
  const cappedIterations = Math.min(
    maxIterations || 10,
    planLimits.autoresearchMaxIterations
  );

  const config: AutoResearchConfig = {
    agentId,
    userId,
    suiteId,
    mode: mode || "autotune",
    maxIterations: cappedIterations,
    targetScore: targetScore ?? undefined,
    maxTokenBudget: maxTokenBudget ?? undefined,
    mutationDimensions: (mutationDimensions as MutationDimension[]) || ["system_prompt"],
    strategy: (strategy as MutationStrategy) || "llm_guided",
  };

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      await runAutoTune(config, {
        onIterationStart: (index, description) => {
          send("iteration_start", { index, description });
        },
        onIterationEnd: (iteration) => {
          send("iteration_end", iteration);
        },
        onProgress: (data) => {
          send("progress", data);
        },
        onComplete: (run) => {
          send("done", {
            runId: run.id,
            bestScore: run.bestScore,
            baselineScore: run.baselineScore,
            totalIterations: run.iterations.length,
            totalCost: run.totalCost,
            bestPrompt: run.iterations[run.bestIterationIndex]?.configSnapshot?.systemPrompt || "",
          });
        },
        onError: (error) => {
          send("error", { message: error.message });
        },
      });
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
