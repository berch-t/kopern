import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export const revalidate = 3600; // cache 1h

export async function GET() {
  try {
    const [agents, gradingRuns, autoresearchRuns, sessions] = await Promise.all([
      adminDb.collectionGroup("agents").count().get(),
      adminDb.collectionGroup("runs").count().get(),
      adminDb.collectionGroup("autoresearchRuns").count().get(),
      adminDb.collectionGroup("sessions").count().get(),
    ]);

    return NextResponse.json({
      agents: agents.data().count,
      gradingRuns: gradingRuns.data().count,
      optimized: autoresearchRuns.data().count,
      sessions: sessions.data().count,
    }, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (e) {
    console.error("[metrics]", (e as Error).message);
    return NextResponse.json({ agents: 0, gradingRuns: 0, optimized: 0, sessions: 0 });
  }
}
