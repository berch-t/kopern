import { NextRequest, NextResponse } from "next/server";
import { resolveApiKey } from "@/lib/mcp/auth";
import { adminDb } from "@/lib/firebase/admin";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";

function corsHeaders(
  origin: string | null,
  allowedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
  if (
    allowedOrigins.length === 0 ||
    (origin && allowedOrigins.includes(origin))
  ) {
    headers["Access-Control-Allow-Origin"] = origin || "*";
  }
  return headers;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("Origin");
  const headers = corsHeaders(origin, []);
  return new NextResponse(null, { status: 204, headers });
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("Origin");

  const { searchParams } = new URL(request.url);
  const plainKey = searchParams.get("key");

  if (!plainKey) {
    return NextResponse.json(
      { error: "Missing API key" },
      { status: 401 }
    );
  }

  const resolved = await resolveApiKey(plainKey);
  if (!resolved || !resolved.enabled) {
    return NextResponse.json(
      { error: "Invalid or disabled API key" },
      { status: 401 }
    );
  }

  const { userId, agentId } = resolved;

  // Load widget config
  const widgetSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}/connectors/widget`)
    .get();

  if (!widgetSnap.exists) {
    return NextResponse.json(
      { error: "Widget not configured" },
      { status: 404 }
    );
  }

  const widgetData = widgetSnap.data()!;
  const allowedOrigins: string[] = widgetData.allowedOrigins || [];
  const cors = corsHeaders(origin, allowedOrigins);

  if (!widgetData.enabled) {
    return NextResponse.json(
      { error: "Widget is not enabled" },
      { status: 403, headers: cors }
    );
  }

  // CORS origin check
  if (
    allowedOrigins.length > 0 &&
    (!origin || !allowedOrigins.includes(origin))
  ) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 }
    );
  }

  // Load agent name
  const agentSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}`)
    .get();
  const agentName = agentSnap.data()?.name || "AI Assistant";

  // Check plan for branding removal
  const userSnap = await adminDb.doc(`users/${userId}`).get();
  const plan: PlanTier = userSnap.data()?.subscription?.plan || "starter";
  const canRemoveBranding = PLAN_LIMITS[plan].widgetRemoveBranding;

  // Force showPoweredBy if plan doesn't allow removal
  const showPoweredBy = canRemoveBranding
    ? widgetData.showPoweredBy !== false
    : true;

  return NextResponse.json(
    {
      welcomeMessage: widgetData.welcomeMessage || "",
      position: widgetData.position || "bottom-right",
      showPoweredBy,
      agentName,
    },
    { headers: cors }
  );
}
