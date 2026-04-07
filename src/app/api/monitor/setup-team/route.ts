import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createMonitorTeam } from "@/lib/monitor/create-monitor-team";

export async function POST(request: NextRequest) {
  // Verify Firebase auth token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const teamId = await createMonitorTeam(userId);

    return NextResponse.json({ teamId, message: "Monitor team created" });
  } catch (err) {
    console.error("[Monitor] Setup team error:", err);
    return NextResponse.json(
      { error: "Failed to create monitor team" },
      { status: 500 }
    );
  }
}
