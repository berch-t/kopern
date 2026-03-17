import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAutoFix } from "@/lib/autoresearch/autofix";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { userId, suiteId, runId } = await request.json();

  if (!userId || !suiteId || !runId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      await runAutoFix(
        { userId, agentId, suiteId, runId },
        {
          onStatus: (status) => send("status", { status }),
          onDiagnostic: (diagnostic) => send("diagnostic", diagnostic),
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
