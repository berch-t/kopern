import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { resolveApiKey } from "@/lib/mcp/auth";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { trackUsage } from "@/lib/mcp/token-counter";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKeys } from "@/lib/llm/resolve-key";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { checkRateLimit, mcpRateLimit } from "@/lib/security/rate-limit";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";

// ─── Auth ────────────────────────────────────────────────────────────

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

// ─── Agent loader ────────────────────────────────────────────────────

async function loadAgent(userId: string, agentId: string) {
  const snap = await adminDb
    .collection("users").doc(userId)
    .collection("agents").doc(agentId)
    .get();
  return snap.exists ? snap.data()! : null;
}

async function loadSkills(userId: string, agentId: string) {
  const snap = await adminDb
    .collection("users").doc(userId)
    .collection("agents").doc(agentId)
    .collection("skills")
    .get();
  return snap.docs.map((d) => d.data());
}

// ─── OpenAI SSE helpers ──────────────────────────────────────────────

const OPENAI_FINISH_REASONS = { end_turn: "stop", tool_use: "tool_calls", max_tokens: "length" } as const;

function openaiChunk(id: string, model: string, delta: Record<string, unknown>, finishReason: string | null = null) {
  return {
    id,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  };
}

function openaiSyncResponse(id: string, model: string, content: string, usage: { prompt_tokens: number; completion_tokens: number }) {
  return {
    id,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: {
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.prompt_tokens + usage.completion_tokens,
    },
  };
}

// ─── POST handler ────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;

  // 1. Auth
  const resolved = await authenticate(request);
  if (!resolved) {
    return NextResponse.json(
      { error: { message: "Missing or invalid API key. Use Bearer header or ?key= param.", type: "invalid_request_error", code: "invalid_api_key" } },
      { status: 401 }
    );
  }
  if (!resolved.enabled) {
    return NextResponse.json(
      { error: { message: "API key is disabled.", type: "invalid_request_error", code: "api_key_disabled" } },
      { status: 403 }
    );
  }
  // Verify the key is bound to this agent
  if (resolved.agentId !== agentId) {
    return NextResponse.json(
      { error: { message: "API key is not authorized for this agent.", type: "invalid_request_error", code: "agent_mismatch" } },
      { status: 403 }
    );
  }

  // 2. Rate limit
  const rl = await checkRateLimit(mcpRateLimit, agentId);
  if (rl) return rl;

  // 3. Plan limits
  const tokenCheck = await checkPlanLimits(resolved.userId, "tokens");
  if (!tokenCheck.allowed) {
    return NextResponse.json(
      { error: { message: tokenCheck.reason || "Plan token limit reached.", type: "insufficient_quota", code: "quota_exceeded" } },
      { status: 429 }
    );
  }

  // 4. Parse body (OpenAI format)
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body.", type: "invalid_request_error", code: "invalid_json" } },
      { status: 400 }
    );
  }

  const messages = body.messages as { role: string; content: string }[] | undefined;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: { message: "messages is required and must be a non-empty array.", type: "invalid_request_error", code: "invalid_messages" } },
      { status: 400 }
    );
  }

  const stream = body.stream === true;

  // 5. Load agent
  const agent = await loadAgent(resolved.userId, agentId);
  if (!agent) {
    return NextResponse.json(
      { error: { message: "Agent not found.", type: "invalid_request_error", code: "agent_not_found" } },
      { status: 404 }
    );
  }

  const skills = await loadSkills(resolved.userId, agentId);
  const modelId = agent.modelId as string;
  const modelProvider = agent.modelProvider as string;

  // Build system prompt with skills
  let systemPrompt = (agent.systemPrompt as string) || "";
  if (skills.length > 0) {
    const xml = skills.map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`).join("\n\n");
    systemPrompt += `\n\n<skills>\n${xml}\n</skills>`;
  }

  // Convert OpenAI messages to Kopern format (ignore system — we use the agent's)
  const kopernMessages: LLMMessage[] = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (kopernMessages.length === 0) {
    return NextResponse.json(
      { error: { message: "At least one user message is required.", type: "invalid_request_error", code: "no_user_message" } },
      { status: 400 }
    );
  }

  // Resolve API keys
  const apiKeys = await resolveProviderKeys(resolved.userId, modelProvider);
  const apiKey = apiKeys[0];

  // Create session
  const lastUserMsg = kopernMessages.filter((m) => m.role === "user").pop();
  let sessionId = "";
  try {
    sessionId = await createSessionServer(resolved.userId, agentId, {
      purpose: (typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "").slice(0, 120),
      modelUsed: modelId,
      providerUsed: modelProvider,
      source: "openai_compat",
    });
  } catch { /* continue without session */ }

  const completionId = `chatcmpl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  // ─── Streaming mode ──────────────────────────────────────────────
  if (stream) {
    const encoder = new TextEncoder();
    let sseController: ReadableStreamDefaultController | null = null;

    const readableStream = new ReadableStream({
      start(c) { sseController = c; },
    });

    function sendSSE(data: unknown) {
      if (!sseController) return;
      sseController.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    }

    function closeSSE() {
      if (!sseController) return;
      sseController.enqueue(encoder.encode("data: [DONE]\n\n"));
      sseController.close();
    }

    // Send initial role chunk
    sendSSE(openaiChunk(completionId, modelId, { role: "assistant" }));

    const toolEvents: { type: string; data: Record<string, unknown> }[] = [];
    let fullResponse = "";

    runAgentWithTools(
      {
        provider: modelProvider,
        model: modelId,
        systemPrompt,
        messages: kopernMessages,
        userId: resolved.userId,
        agentId,
        connectedRepos: (agent.connectedRepos as string[]) || [],
        apiKey,
        apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
        skipOutboundWebhooks: true,
        toolApprovalPolicy: (agent.toolApprovalPolicy as "auto" | "confirm_destructive" | "confirm_all") || "auto",
        riskLevel: (agent.riskLevel as "minimal" | "limited" | "high") || "minimal",
      },
      {
        onToken: (text) => {
          fullResponse += text;
          sendSSE(openaiChunk(completionId, modelId, { content: text }));
        },
        onToolStart: (tc) => {
          toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } });
        },
        onToolEnd: (result) => {
          toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } });
        },
        onDone: (metrics) => {
          // Final chunk with finish_reason
          sendSSE(openaiChunk(completionId, modelId, {}, "stop"));
          closeSSE();

          // Track usage (fire-and-forget)
          persistSession(resolved.userId, agentId, resolved.mcpServerId, sessionId, agent, fullResponse, lastUserMsg?.content as string || "", toolEvents, metrics);
        },
        onError: (err) => {
          sendSSE({ error: { message: err.message, type: "server_error" } });
          closeSSE();
          if (sessionId) endSessionServer(resolved.userId, agentId, sessionId).catch(() => {});
        },
      }
    );

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  // ─── Non-streaming mode ────────────────────────────────────────────
  let fullResponse = "";
  const toolEvents: { type: string; data: Record<string, unknown> }[] = [];

  try {
    const metrics = await new Promise<AgentRunMetrics>((resolve, reject) => {
      runAgentWithTools(
        {
          provider: modelProvider,
          model: modelId,
          systemPrompt,
          messages: kopernMessages,
          userId: resolved.userId,
          agentId,
          connectedRepos: (agent.connectedRepos as string[]) || [],
          apiKey,
          apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
          skipOutboundWebhooks: true,
          toolApprovalPolicy: (agent.toolApprovalPolicy as "auto" | "confirm_destructive" | "confirm_all") || "auto",
          riskLevel: (agent.riskLevel as "minimal" | "limited" | "high") || "minimal",
        },
        {
          onToken: (text) => { fullResponse += text; },
          onToolStart: (tc) => { toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } }); },
          onToolEnd: (result) => { toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } }); },
          onDone: (m) => resolve(m),
          onError: (err) => reject(err),
        }
      );
    });

    // Track usage
    persistSession(resolved.userId, agentId, resolved.mcpServerId, sessionId, agent, fullResponse, lastUserMsg?.content as string || "", toolEvents, metrics);

    return NextResponse.json(
      openaiSyncResponse(completionId, modelId, fullResponse, {
        prompt_tokens: metrics.inputTokens,
        completion_tokens: metrics.outputTokens,
      })
    );
  } catch (err) {
    if (sessionId) endSessionServer(resolved.userId, agentId, sessionId).catch(() => {});
    return NextResponse.json(
      { error: { message: (err as Error).message, type: "server_error", code: "agent_error" } },
      { status: 500 }
    );
  }
}

// ─── Session persistence (fire-and-forget) ───────────────────────────

function persistSession(
  userId: string,
  agentId: string,
  mcpServerId: string,
  sessionId: string,
  agent: Record<string, unknown>,
  fullResponse: string,
  userMessage: string,
  toolEvents: { type: string; data: Record<string, unknown> }[],
  metrics: AgentRunMetrics
) {
  // MCP-specific usage tracking
  trackUsage(userId, agentId, mcpServerId, metrics.inputTokens, metrics.outputTokens).catch((err) =>
    logAppError({ code: "OPENAI_COMPAT_USAGE_TRACK_FAILED", message: (err as Error).message, source: "openai_compat", userId, agentId })
  );

  if (!sessionId) return;

  const cost = calculateTokenCost(agent.modelProvider as string, metrics.inputTokens, metrics.outputTokens, agent.modelId as string);
  const events = [
    { type: "message", data: { role: "user", content: userMessage } },
    ...toolEvents,
    { type: "message", data: { role: "assistant", content: fullResponse.slice(0, 10000) } },
  ];

  appendSessionEvents(userId, agentId, sessionId, events).catch((err) =>
    logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "openai_compat", userId, agentId })
  );
  updateSessionMetrics(userId, agentId, sessionId, {
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
    cost,
    toolCallCount: metrics.toolCallCount,
    messageCount: 2,
  }).catch((err) =>
    logAppError({ code: "SESSION_METRICS_WRITE_FAILED", message: (err as Error).message, source: "openai_compat", userId, agentId })
  );
  endSessionServer(userId, agentId, sessionId).catch((err) =>
    logAppError({ code: "SESSION_END_FAILED", message: (err as Error).message, source: "openai_compat", userId, agentId })
  );
}
