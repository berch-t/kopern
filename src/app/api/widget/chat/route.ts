import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { resolveApiKey } from "@/lib/mcp/auth";
import { adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { resolveProviderKey } from "@/lib/llm/resolve-key";

interface WidgetChatRequest {
  message: string;
  history?: { role: "user" | "assistant"; content: string }[];
}

function corsHeaders(
  origin: string | null,
  allowedOrigins: string[]
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function extractApiKey(request: NextRequest): string | null {
  const { searchParams } = new URL(request.url);
  const keyFromQuery = searchParams.get("key");
  if (keyFromQuery) return keyFromQuery;

  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("Origin");
  // For preflight, allow all origins (actual CORS check happens in POST)
  const headers = corsHeaders(origin, []);
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("Origin");

  // --- Auth via API key ---
  const plainKey = extractApiKey(request);
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

  // --- Load widget config for CORS + settings ---
  const widgetSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}/connectors/widget`)
    .get();
  const widgetConfig = widgetSnap.data() as
    | {
        enabled: boolean;
        allowedOrigins: string[];
        welcomeMessage: string;
        position: string;
        showPoweredBy: boolean;
      }
    | undefined;

  if (!widgetConfig?.enabled) {
    return NextResponse.json(
      { error: "Widget is not enabled for this agent" },
      { status: 403 }
    );
  }

  // --- CORS origin check ---
  const allowedOrigins = widgetConfig.allowedOrigins || [];
  if (
    allowedOrigins.length > 0 &&
    (!origin || !allowedOrigins.includes(origin))
  ) {
    return NextResponse.json(
      { error: "Origin not allowed" },
      { status: 403 }
    );
  }

  const cors = corsHeaders(origin, allowedOrigins);

  // --- Plan checks (skip for admin) ---
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  if (!isAdmin) {
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: tokenCheck.reason, plan: tokenCheck.plan },
        { status: 403, headers: cors }
      );
    }

    const connectorCheck = await checkPlanLimits(userId, "connectors");
    if (!connectorCheck.allowed) {
      return NextResponse.json(
        { error: connectorCheck.reason, plan: connectorCheck.plan },
        { status: 403, headers: cors }
      );
    }
  }

  // --- Parse request body ---
  let body: WidgetChatRequest;
  try {
    body = (await request.json()) as WidgetChatRequest;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400, headers: cors }
    );
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400, headers: cors }
    );
  }

  // --- Load agent doc ---
  const agentSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}`)
    .get();
  if (!agentSnap.exists) {
    return NextResponse.json(
      { error: "Agent not found" },
      { status: 404, headers: cors }
    );
  }

  const agentData = agentSnap.data()!;

  // --- Load skills ---
  const skillsSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/skills`)
    .get();
  const skills: { name: string; content: string }[] = [];
  for (const doc of skillsSnap.docs) {
    const s = doc.data();
    if (s.name && s.content) {
      skills.push({ name: s.name, content: s.content });
    }
  }

  // --- Build system prompt ---
  let systemPrompt = agentData.systemPrompt || "";

  if (skills.length > 0) {
    const skillsXml = skills
      .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
      .join("\n\n");
    systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
  }

  // --- Build message history ---
  const messages = [
    ...(body.history || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: body.message },
  ];

  // --- SSE streaming ---
  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "thinking" });

      // Resolve API key from user Firestore settings
      const apiKey = await resolveProviderKey(userId, agentData.modelProvider || "anthropic");

      await runAgentWithTools(
        {
          provider: agentData.modelProvider || "anthropic",
          model: agentData.modelId || "claude-sonnet-4-5-20250514",
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos: agentData.connectedRepos || [],
          apiKey,
        },
        {
          onToken: (text) => {
            send("token", { text });
          },
          onToolStart: (tc) => {
            send("tool_start", { name: tc.name });
          },
          onToolEnd: (result) => {
            send("tool_end", {
              name: result.name,
              isError: result.isError,
            });
          },
          onDone: (metrics) => {
            const cost = calculateTokenCost(
              agentData.modelProvider || "anthropic",
              metrics.inputTokens,
              metrics.outputTokens
            );
            send("done", {
              metrics: {
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                estimatedCost: cost,
              },
            });
            close();
          },
          onError: (error) => {
            send("error", { message: error.message });
            close();
          },
        }
      );
    } catch (err) {
      send("error", { message: (err as Error).message });
      close();
    }
  })();

  // --- Return SSE response with CORS headers ---
  const response = sseResponse(stream);
  for (const [key, value] of Object.entries(cors)) {
    response.headers.set(key, value);
  }
  return response;
}
