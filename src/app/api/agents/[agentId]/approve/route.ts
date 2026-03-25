import { NextRequest, NextResponse } from "next/server";
import { resolveApprovalGate } from "@/lib/tools/approval-gate";
import type { ApprovalDecision } from "@/lib/tools/approval";
import { approveToolSchema, validateBody } from "@/lib/security/validation";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  await params; // consume params
  const raw = await request.json();
  const parsed = validateBody(approveToolSchema, raw);
  if ("error" in parsed) return parsed.error;
  const { toolCallId, decision } = parsed.data;

  const resolved = resolveApprovalGate(toolCallId, decision);
  if (!resolved) {
    return NextResponse.json({ error: "No pending approval for this tool call" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
