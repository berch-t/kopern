import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runTournament } from "@/lib/autoresearch/tournament";
import type { MutationDimension } from "@/lib/autoresearch/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { userId, suiteId, dimensions, maxCandidates, rounds } = await request.json();

  if (!userId || !suiteId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const planCheck = await checkPlanLimits(userId, "autoresearch");
  if (!planCheck.allowed) {
    return NextResponse.json({ error: planCheck.reason, plan: planCheck.plan }, { status: 403 });
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      await runTournament(
        {
          userId,
          agentId,
          suiteId,
          dimensions: (dimensions as MutationDimension[]) || ["model", "thinking_level"],
          maxCandidates: maxCandidates || 6,
          rounds: rounds || 2,
        },
        {
          onStatus: (status) => send("status", { status }),
          onRound: (round, candidates) => send("round", { round, candidates }),
          onResult: (result) => send("result", result),
          onError: (error) => send("error", { message: error.message }),
        }
      );
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
