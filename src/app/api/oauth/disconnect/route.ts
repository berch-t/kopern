// POST /api/oauth/disconnect — revoke and delete a service connector
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { revokeServiceConnector } from "@/lib/services/oauth-tokens";
import type { ServiceProvider } from "@/lib/firebase/firestore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(token);
    const userId = decoded.uid;

    const { provider } = (await req.json()) as { provider: ServiceProvider };
    if (!provider || !["google", "microsoft"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    await revokeServiceConnector(userId, provider);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
