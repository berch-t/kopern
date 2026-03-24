import { NextRequest, NextResponse, after } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { logAppError } from "@/lib/errors/logger";
import { resolveProviderKey } from "@/lib/llm/resolve-key";
import { createSessionServer, updateSessionMetrics, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";
import { calculateTokenCost } from "@/lib/billing/pricing";
import type { AgentRunMetrics } from "@/lib/tools/run-agent";
import {
  verifyTelegramSecret,
  parseTelegramUpdate,
  lookupTelegramBot,
  sendTelegramMessage,
  sendTelegramChatAction,
} from "@/lib/connectors/telegram";

export async function POST(request: NextRequest) {
  // Telegram sends secret in header — lookup bot by secret
  const secretToken = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (!secretToken) {
    return NextResponse.json({ error: "Missing secret token" }, { status: 401 });
  }

  const body = await request.json();
  const update = parseTelegramUpdate(body);

  // Ignore non-text or bot messages
  if (!update) {
    return NextResponse.json({ ok: true });
  }

  // Respond 200 immediately, process async (Telegram re-sends after 60s if no 200)
  after(async () => {
    try {
      await processTelegramMessage(secretToken, update);
    } catch (err) {
      logAppError({
        code: "TELEGRAM_PROCESSING_FAILED",
        message: (err as Error).message,
        source: "webhook",
        severity: "critical",
        metadata: { chatId: update.chatId, error: String(err) },
      });
    }
  });

  return NextResponse.json({ ok: true });
}

async function processTelegramMessage(
  secretToken: string,
  update: { chatId: number; text: string; messageId: number; replyToMessageId?: number; senderName: string; isGroup: boolean }
): Promise<void> {
  // Lookup bot + agent
  const botLookup = await lookupTelegramBot(secretToken);
  if (!botLookup) {
    logAppError({
      code: "TELEGRAM_BOT_NOT_FOUND",
      message: "No bot mapped for this secret token",
      source: "webhook",
      severity: "error",
    });
    return;
  }

  const { userId, agentId, botToken } = botLookup;

  // Send "typing" indicator
  await sendTelegramChatAction(botToken, update.chatId);

  // Plan limits (skip for admin)
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  if (!isAdmin) {
    const planCheck = await checkPlanLimits(userId, "connectors");
    if (!planCheck.allowed) {
      await sendTelegramMessage(botToken, update.chatId, `Plan limit reached — ${planCheck.reason}`, update.messageId);
      return;
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      await sendTelegramMessage(botToken, update.chatId, `Token limit reached — ${tokenCheck.reason}`, update.messageId);
      return;
    }
  }

  // Load agent config
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) {
    await sendTelegramMessage(botToken, update.chatId, "Agent not found. Please reconnect from the Kopern dashboard.", update.messageId);
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
  systemPrompt += `\n\n<context>\nCurrent date: ${now.toISOString().slice(0, 10)}\nChannel: Telegram (${update.isGroup ? "group" : "private"})\nUser: ${update.senderName}\n</context>`;

  if (skills.length > 0) {
    const skillsXml = skills.map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`).join("\n");
    systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
  }

  // Build messages (no thread history for now — Telegram doesn't have threads like Slack)
  const messages: LLMMessage[] = [
    { role: "user", content: update.text },
  ];

  // Resolve API key
  const apiKey = await resolveProviderKey(userId, (agentData.modelProvider as string) || "anthropic");

  // Create session
  let sessionId = "";
  try {
    sessionId = await createSessionServer(userId, agentId, {
      purpose: update.text.slice(0, 120),
      modelUsed: (agentData.modelId as string) || "claude-sonnet-4-6",
      providerUsed: (agentData.modelProvider as string) || "anthropic",
      source: "webhook", // reuse existing source type
    });
  } catch { /* continue without session */ }

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
      },
      {
        onToken: (text) => { fullResponse += text; },
        onToolStart: (tc) => { toolEvents.push({ type: "tool_call", data: { name: tc.name, args: tc.args } }); },
        onToolEnd: (result) => { toolEvents.push({ type: "tool_result", data: { name: result.name, result: result.result, isError: result.isError } }); },
        onDone: (metrics) => { agentMetrics = metrics; },
        onError: (error) => {
          logAppError({ code: "TELEGRAM_AGENT_ERROR", message: error.message, source: "webhook", userId, agentId });
          fullResponse = `Error: ${error.message}`;
        },
      }
    );
  } catch (err) {
    logAppError({ code: "TELEGRAM_AGENT_CRASH", message: (err as Error).message, source: "webhook", severity: "critical", userId, agentId });
    fullResponse = `Unexpected error — ${(err as Error).message}`;
  }

  // Persist session
  if (sessionId) {
    const modelId = (agentData.modelId as string) || "claude-sonnet-4-6";
    const provider = (agentData.modelProvider as string) || "anthropic";
    const m = agentMetrics || { inputTokens: 0, outputTokens: 0, toolCallCount: 0, toolIterations: 0 };
    const cost = calculateTokenCost(provider, m.inputTokens, m.outputTokens, modelId);
    const events = [
      { type: "message", data: { role: "user", content: update.text } },
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
    await sendTelegramMessage(botToken, update.chatId, fullResponse, update.messageId);
  }
}
