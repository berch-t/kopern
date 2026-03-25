import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { generateComplianceReport } from "@/lib/compliance/generate-report";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    // Auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const report = await generateComplianceReport(userId, agentId);

    return NextResponse.json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate compliance report";
    const status = message === "Agent not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
