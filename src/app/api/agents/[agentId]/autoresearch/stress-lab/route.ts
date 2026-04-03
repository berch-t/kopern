export const maxDuration = 600;
import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runStressLab } from "@/lib/autoresearch/stress-lab";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const { userId, suiteId, casesCount, autoHarden } = await request.json();

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
      await runStressLab(
        { userId, agentId, suiteId, casesCount: casesCount || 10, autoHarden: autoHarden ?? true },
        {
          onStatus: (status) => send("status", { status }),
          onVulnerability: (vuln) => send("vulnerability", vuln),
          onReport: (report) => send("report", report),
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
