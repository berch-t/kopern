import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey } from "@/lib/mcp/auth";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import {
  verifyHmacSignature,
  logWebhookExecution,
} from "@/lib/connectors/webhook";

// ─── Auth helper ─────────────────────────────────────────────────────

async function authenticate(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return resolveApiKey(authHeader.slice(7));
  }
  const keyParam = new URL(request.url).searchParams.get("key");
  if (keyParam) {
    return resolveApiKey(keyParam);
  }
  return null;
}

// ─── POST /api/webhook/[agentId] ────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const start = Date.now();

  // 1. Auth
  const key = await authenticate(request);
  if (!key || !key.enabled) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Verify agentId matches key
  if (key.agentId !== agentId) {
    return NextResponse.json(
      { error: "API key does not match this agent" },
      { status: 401 }
    );
  }

  const { userId } = key;
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  // 3. Plan checks (skip for admin)
  if (!isAdmin) {
    const connectorCheck = await checkPlanLimits(userId, "connectors");
    if (!connectorCheck.allowed) {
      return NextResponse.json({ error: connectorCheck.reason }, { status: 403 });
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      return NextResponse.json({ error: tokenCheck.reason }, { status: 403 });
    }
  }

  // 4. Parse body
  let body: { message?: string; webhookId?: string; metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message || typeof body.message !== "string") {
    return NextResponse.json({ error: "message field is required" }, { status: 400 });
  }

  // 5. HMAC verification if webhookId provided
  if (body.webhookId) {
    try {
      const whSnap = await adminDb
        .doc(`users/${userId}/agents/${agentId}/webhooks/${body.webhookId}`)
        .get();

      if (!whSnap.exists) {
        return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
      }

      const whData = whSnap.data()!;
      if (whData.secret) {
        const signature = request.headers.get("X-Webhook-Signature") || "";
        const rawBody = JSON.stringify(body);
        if (!verifyHmacSignature(rawBody, whData.secret, signature)) {
          return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
        }
      }
    } catch {
      return NextResponse.json({ error: "Failed to verify webhook" }, { status: 500 });
    }
  }

  // 6. Load agent doc
  let agent: Record<string, unknown>;
  try {
    const agentSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("agents")
      .doc(agentId)
      .get();

    if (!agentSnap.exists) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }
    agent = agentSnap.data()!;
  } catch {
    return NextResponse.json({ error: "Failed to load agent" }, { status: 500 });
  }

  // 7. Build system prompt with skills
  let systemPrompt = (agent.systemPrompt as string) || "";
  try {
    const skillsSnap = await adminDb
      .collection("users")
      .doc(userId)
      .collection("agents")
      .doc(agentId)
      .collection("skills")
      .get();

    if (!skillsSnap.empty) {
      const xml = skillsSnap.docs
        .map((d) => {
          const s = d.data();
          return `<skill name="${s.name}">\n${s.content}\n</skill>`;
        })
        .join("\n\n");
      systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
    }
  } catch {
    // Skills are optional — continue without them
  }

  // 8. Build user message with metadata context
  let userMessage = `User message via webhook: ${body.message}`;
  if (body.metadata && Object.keys(body.metadata).length > 0) {
    userMessage += `\nMetadata: ${JSON.stringify(body.metadata)}`;
  }

  const messages: LLMMessage[] = [{ role: "user", content: userMessage }];

  // 9. Run agent synchronously (collect all output)
  try {
    const chunks: string[] = [];
    let finalMetrics: AgentRunMetrics | null = null;

    await new Promise<void>((resolve, reject) => {
      runAgentWithTools(
        {
          provider: (agent.modelProvider as string) || "anthropic",
          model: (agent.modelId as string) || "claude-sonnet-4-20250514",
          systemPrompt,
          messages,
          userId,
          agentId,
          connectedRepos: (agent.connectedRepos as string[]) || [],
        },
        {
          onToken: (text) => {
            chunks.push(text);
          },
          onDone: (metrics) => {
            finalMetrics = metrics;
            resolve();
          },
          onError: (error) => {
            reject(error);
          },
        }
      );
    });

    const response = chunks.join("");
    const metrics = finalMetrics || {
      inputTokens: 0,
      outputTokens: 0,
      toolCallCount: 0,
      toolIterations: 0,
    };

    // 10. Log inbound webhook execution
    logWebhookExecution(userId, agentId, {
      webhookId: body.webhookId || "direct",
      direction: "inbound",
      status: "success",
      statusCode: 200,
      requestBody: JSON.stringify(body),
      responseBody: response,
      durationMs: Date.now() - start,
    }).catch(() => {});

    // 11. Do NOT fire outbound webhooks from inbound to prevent infinite loops
    //     (inbound → outbound → external service → inbound → ...)

    return NextResponse.json({
      response,
      metrics: {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        toolCallCount: metrics.toolCallCount,
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Agent execution failed";

    // Log error
    logWebhookExecution(userId, agentId, {
      webhookId: body.webhookId || "direct",
      direction: "inbound",
      status: "error",
      statusCode: 500,
      requestBody: JSON.stringify(body),
      responseBody: errorMessage,
      durationMs: Date.now() - start,
    }).catch(() => {});

    // Do NOT fire outbound webhooks from inbound (anti-loop)

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
