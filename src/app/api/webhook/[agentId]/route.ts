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
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKey } from "@/lib/llm/resolve-key";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";

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

  // 9. Resolve API key from user Firestore settings
  const apiKey = await resolveProviderKey(userId, (agent.modelProvider as string) || "anthropic");

  // 10. Run agent synchronously (collect all output)
  let sessionId = "";
  try {
    // Create session for webhook tracking
    try {
      sessionId = await createSessionServer(userId, agentId, {
        purpose: body.message.slice(0, 120),
        modelUsed: (agent.modelId as string) || "claude-sonnet-4-20250514",
        providerUsed: (agent.modelProvider as string) || "anthropic",
        source: "webhook",
      });
    } catch { /* continue without session */ }

    const chunks: string[] = [];
    const toolEvents: { type: string; data: Record<string, unknown> }[] = [];
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
          apiKey,
        },
        {
          onToken: (text) => {
            chunks.push(text);
          },
          onToolStart: (tc) => {
            toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } });
          },
          onToolEnd: (result) => {
            toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } });
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

    // Persist session (fire-and-forget)
    if (sessionId) {
      const modelId = (agent.modelId as string) || "claude-sonnet-4-20250514";
      const provider = (agent.modelProvider as string) || "anthropic";
      const cost = calculateTokenCost(provider, metrics.inputTokens, metrics.outputTokens, modelId);
      const events = [
        { type: "message", data: { role: "user", content: body.message } },
        ...toolEvents,
        { type: "message", data: { role: "assistant", content: response.slice(0, 10000) } },
      ];
      appendSessionEvents(userId, agentId, sessionId, events).catch((err) => logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
      updateSessionMetrics(userId, agentId, sessionId, {
        inputTokens: metrics.inputTokens,
        outputTokens: metrics.outputTokens,
        cost,
        toolCallCount: metrics.toolCallCount,
        messageCount: 2,
      }).catch((err) => logAppError({ code: "SESSION_METRICS_WRITE_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
      endSessionServer(userId, agentId, sessionId).catch((err) => logAppError({ code: "SESSION_END_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
    }

    // Log inbound webhook execution
    logWebhookExecution(userId, agentId, {
      webhookId: body.webhookId || "direct",
      direction: "inbound",
      status: "success",
      statusCode: 200,
      requestBody: JSON.stringify(body),
      responseBody: response,
      durationMs: Date.now() - start,
    }).catch((err) => logAppError({ code: "WEBHOOK_LOG_FAILED", message: (err as Error).message, source: "webhook_inbound", agentId }));

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
    if (sessionId) endSessionServer(userId, agentId, sessionId).catch(() => {});

    // Log error
    logWebhookExecution(userId, agentId, {
      webhookId: body.webhookId || "direct",
      direction: "inbound",
      status: "error",
      statusCode: 500,
      requestBody: JSON.stringify(body),
      responseBody: errorMessage,
      durationMs: Date.now() - start,
    }).catch((err) => logAppError({ code: "WEBHOOK_LOG_FAILED", message: (err as Error).message, source: "webhook_inbound", agentId }));

    // Do NOT fire outbound webhooks from inbound (anti-loop)

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
