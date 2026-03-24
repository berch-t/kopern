import { NextRequest, NextResponse } from "next/server";
import { resolveApprovalGate } from "@/lib/tools/approval-gate";
import type { ApprovalDecision } from "@/lib/tools/approval";

interface ApproveRequestBody {
  toolCallId: string;
  decision: ApprovalDecision;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await params; // consume params
  const body = (await request.json()) as ApproveRequestBody;
  const { toolCallId, decision } = body;

  if (!toolCallId || !decision || !["approved", "denied"].includes(decision)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const resolved = resolveApprovalGate(toolCallId, decision);
  if (!resolved) {
    return NextResponse.json({ error: "No pending approval for this tool call" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
