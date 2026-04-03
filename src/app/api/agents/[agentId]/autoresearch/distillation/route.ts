export const maxDuration = 600;
import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runDistillation } from "@/lib/autoresearch/distillation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { userId, suiteId } = await request.json();

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

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      await runDistillation(
        { userId, agentId, suiteId },
        {
          onStatus: (status) => send("status", { status }),
          onStudent: (student) => send("student", student),
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
