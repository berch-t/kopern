import { NextRequest, NextResponse, after } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { logAppError } from "@/lib/errors/logger";
import {
  registerConversationalGate,
  resolveConversationalGate,
  parseApprovalResponse,
  hasPendingGate,
  formatApprovalMessage,
} from "@/lib/tools/conversational-approval";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";
import type { AgentRunMetrics } from "@/lib/tools/run-agent";
import {
  verifyWhatsAppSignature,
  parseWhatsAppWebhook,
  lookupWhatsAppPhone,
  getWhatsAppAccessToken,
  sendWhatsAppMessage,
  markWhatsAppMessageRead,
} from "@/lib/connectors/whatsapp";
import { connectorRateLimit } from "@/lib/security/rate-limit";

/**
 * GET /api/whatsapp/webhook — Meta verification challenge
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !challenge) {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }

  // Verify token against stored verify tokens — we check all registered WhatsApp connectors
  // For simplicity, use an env var for the global verify token
  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: "Token mismatch" }, { status: 403 });
  }

  // Return the challenge as plain text (Meta requirement)
  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

/**
 * POST /api/whatsapp/webhook — Receive WhatsApp messages
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify HMAC signature
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    const signature = request.headers.get("X-Hub-Signature-256") || "";
    if (!verifyWhatsAppSignature(rawBody, signature, appSecret)) {
      logAppError({
        code: "WHATSAPP_SIGNATURE_INVALID",
        message: "WhatsApp webhook signature verification failed",
        source: "webhook",
        severity: "warning",
      });
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const message = parseWhatsAppWebhook(body);

  // Ignore non-text messages, status updates, etc.
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  // Process async — return 200 immediately (Meta retries after timeout)
  after(async () => {
    try {
      await processWhatsAppMessage(message);
    } catch (err) {
      logAppError({
        code: "WHATSAPP_PROCESSING_FAILED",
        message: (err as Error).message,
        source: "webhook",
        severity: "critical",
        metadata: { from: message.from, phoneNumberId: message.phoneNumberId },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

async function processWhatsAppMessage(
  message: { from: string; text: string; messageId: string; phoneNumberId: string; senderName: string }
): Promise<void> {
  // Lookup agent by phone number ID
  const phoneLookup = await lookupWhatsAppPhone(message.phoneNumberId);
  if (!phoneLookup) {
    logAppError({
      code: "WHATSAPP_PHONE_NOT_FOUND",
      message: `No agent mapped for WhatsApp phone ${message.phoneNumberId}`,
      source: "webhook",
      severity: "error",
    });
    return;
  }

  const { userId, agentId } = phoneLookup;

  // Rate limit by phone
  if (connectorRateLimit) {
    const rl = await connectorRateLimit.limit(`whatsapp:${message.phoneNumberId}`);
    if (!rl.success) {
      logAppError({ code: "WHATSAPP_RATE_LIMITED", message: "Rate limit exceeded", source: "webhook", severity: "warning", userId, agentId });
      return;
    }
  }

  // Get access token
  const accessToken = await getWhatsAppAccessToken(userId, agentId);
  if (!accessToken) {
    logAppError({
      code: "WHATSAPP_NO_TOKEN",
      message: "No access token found for WhatsApp connector",
      source: "webhook",
      severity: "error",
      userId,
      agentId,
    });
    return;
  }

  // Check if this message is an approval response for a pending gate
  const chatKey = `${message.phoneNumberId}:${message.from}`;
  if (hasPendingGate("whatsapp", chatKey)) {
    const decision = parseApprovalResponse(message.text);
    if (decision) {
      resolveConversationalGate("whatsapp", chatKey, decision);
      await sendWhatsAppMessage(
        message.phoneNumberId,
        accessToken,
        message.from,
        decision === "approved" ? "Tool approved. Executing..." : "Tool denied.",
      );
      return;
    }
  }

  // Mark message as read
  await markWhatsAppMessageRead(message.phoneNumberId, accessToken, message.messageId);

  // Plan limits
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  if (!isAdmin) {
    const planCheck = await checkPlanLimits(userId, "connectors");
    if (!planCheck.allowed) {
      await sendWhatsAppMessage(message.phoneNumberId, accessToken, message.from, `Plan limit reached: ${planCheck.reason}`);
      return;
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      await sendWhatsAppMessage(message.phoneNumberId, accessToken, message.from, `Token limit reached: ${tokenCheck.reason}`);
      return;
    }
  }

  // Load agent config
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) {
    await sendWhatsAppMessage(message.phoneNumberId, accessToken, message.from, "Agent not found. Please reconnect from Kopern.");
    return;
  }

  const agentData = agentSnap.data()!;

  // Load skills
  const skillsSnap = await adminDb.collection(`users/${userId}/agents/${agentId}/skills`).get();
  const skills = skillsSnap.docs.map((doc) => ({
    name: doc.data().name as string,
    content: doc.data().content as string,
  }));

  // Build system prompt
  let systemPrompt = (agentData.systemPrompt as string) || "";
  const now = new Date();
  systemPrompt += `\n\n<context>\nCurrent date: ${now.toISOString().slice(0, 10)}\nChannel: WhatsApp\nUser: ${message.senderName} (${message.from})\n</context>`;

  if (skills.length > 0) {
    const skillsXml = skills.map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`).join("\n");
    systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
  }

  const messages: LLMMessage[] = [{ role: "user", content: message.text }];
  const whatsappProvider = (agentData.modelProvider as string) || "anthropic";
  const apiKeys = await resolveProviderKeys(userId, whatsappProvider);
  const apiKey = apiKeys[0];

  // Create session
  let sessionId = "";
  try {
    sessionId = await createSessionServer(userId, agentId, {
      purpose: message.text.slice(0, 120),
      modelUsed: (agentData.modelId as string) || "claude-sonnet-4-6",
      providerUsed: (agentData.modelProvider as string) || "anthropic",
      source: "webhook",
    });
  } catch { /* continue */ }

  // Run agent
  let fullResponse = "";
  const toolEvents: { type: string; data: Record<string, unknown> }[] = [];
  let agentMetrics: AgentRunMetrics | null = null;

  try {
    await runAgentWithTools(
      {
        provider: (agentData.modelProvider as string) || "anthropic",
        model: (agentData.modelId as string) || "claude-sonnet-4-6",
        systemPrompt,
        messages,
        userId,
        agentId,
        connectedRepos: (agentData.connectedRepos as string[]) || [],
        apiKey,
        apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
        skipOutboundWebhooks: true, // CRITICAL: anti-loop protection
        toolApprovalPolicy: (agentData.toolApprovalPolicy as "auto" | "confirm_destructive" | "confirm_all") || "auto",
        riskLevel: (agentData.riskLevel as "minimal" | "limited" | "high") || "minimal",
      },
      {
        onToken: (text) => { fullResponse += text; },
        onToolStart: (tc) => { toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } }); },
        onToolEnd: (result) => { toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } }); },
        onConversationalApproval: async (request) => {
          const msg = formatApprovalMessage(request.toolName, request.args);
          await sendWhatsAppMessage(message.phoneNumberId, accessToken, message.from, msg);
          return registerConversationalGate("whatsapp", chatKey, request.toolCallId, request.toolName, request.args);
        },
        onDone: (metrics) => { agentMetrics = metrics; },
        onError: (error) => {
          logAppError({ code: "WHATSAPP_AGENT_ERROR", message: error.message, source: "webhook", userId, agentId });
          fullResponse = `Error: ${error.message}`;
        },
      }
    );
  } catch (err) {
    logAppError({ code: "WHATSAPP_AGENT_CRASH", message: (err as Error).message, source: "webhook", severity: "critical", userId, agentId });
    fullResponse = `Unexpected error: ${(err as Error).message}`;
  }

  // Persist session
  if (sessionId) {
    const modelId = (agentData.modelId as string) || "claude-sonnet-4-6";
    const provider = (agentData.modelProvider as string) || "anthropic";
    const m = agentMetrics || { inputTokens: 0, outputTokens: 0, toolCallCount: 0, toolIterations: 0 };
    const cost = calculateTokenCost(provider, m.inputTokens, m.outputTokens, modelId);
    const events = [
      { type: "message", data: { role: "user", content: message.text } },
      ...toolEvents,
      { type: "message", data: { role: "assistant", content: fullResponse.slice(0, 10000) } },
    ];
    appendSessionEvents(userId, agentId, sessionId, events).catch((err) => logAppError({ code: "SESSION_EVENT_WRITE_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
    updateSessionMetrics(userId, agentId, sessionId, {
      inputTokens: m.inputTokens, outputTokens: m.outputTokens, cost, toolCallCount: m.toolCallCount, messageCount: 2,
    }).catch((err) => logAppError({ code: "SESSION_METRICS_WRITE_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
    endSessionServer(userId, agentId, sessionId).catch((err) => logAppError({ code: "SESSION_END_FAILED", message: (err as Error).message, source: "webhook", userId, agentId }));
  }

  // Send response
  if (fullResponse) {
    await sendWhatsAppMessage(message.phoneNumberId, accessToken, message.from, fullResponse);
  }
}
