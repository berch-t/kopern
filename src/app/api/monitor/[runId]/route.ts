import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  if (!runId || !runId.startsWith("mn_")) {
    return NextResponse.json({ error: "Invalid run ID" }, { status: 400 });
  }

  const doc = await adminDb.collection("monitorRuns").doc(runId).get();
  if (!doc.exists) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const data = doc.data()!;

  // Strip IP hash from public response
  const { ip, ...publicData } = data;

  return NextResponse.json(publicData, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
