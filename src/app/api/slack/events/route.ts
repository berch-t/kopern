import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import {
  verifySlackSignature,
  lookupSlackTeam,
  postSlackMessage,
  addReaction,
  getThreadHistory,
} from "@/lib/connectors/slack";

// --- Types for Slack event payloads ---

interface SlackEvent {
  type: string;
  user?: string;
  bot_id?: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
  channel_type?: string;
}

interface SlackEventPayload {
  type: "url_verification" | "event_callback";
  challenge?: string;
  token?: string;
  team_id: string;
  event: SlackEvent;
}

// --- Main handler ---

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Slack request signature
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const timestamp = request.headers.get("X-Slack-Request-Timestamp") || "";
  const signature = request.headers.get("X-Slack-Signature") || "";

  if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as SlackEventPayload;

  // Handle URL verification challenge (Slack setup)
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // For event callbacks, return 200 immediately then process async
  if (body.type === "event_callback") {
    processSlackEvent(body).catch((err) => {
      console.error("[Slack Events] Async processing error:", err);
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// --- Async event processing ---

async function processSlackEvent(body: SlackEventPayload): Promise<void> {
  const event = body.event;
  if (!event) return;

  // Only handle app_mention and direct message events
  const isAppMention = event.type === "app_mention";
  const isDirectMessage = event.type === "message" && event.channel_type === "im";
  if (!isAppMention && !isDirectMessage) return;

  // Skip bot messages to prevent loops
  if (event.bot_id) return;

  // Lookup which agent handles this Slack team
  const teamLookup = await lookupSlackTeam(body.team_id);
  if (!teamLookup) {
    console.error(`[Slack Events] No agent mapped for team ${body.team_id}`);
    return;
  }

  const { userId, agentId } = teamLookup;

  // Check plan limits (skip for admin)
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  if (!isAdmin) {
    const planCheck = await checkPlanLimits(userId, "connectors");
    if (!planCheck.allowed) {
      await postSlackMessage(
        await getBotToken(userId, agentId),
        event.channel,
        `Sorry, this agent's plan limit has been reached: ${planCheck.reason}`,
        event.thread_ts || event.ts
      );
      return;
    }
  }

  // Get bot token from Firestore
  const botToken = await getBotToken(userId, agentId);
  if (!botToken) {
    console.error(`[Slack Events] No bot token for ${userId}/${agentId}`);
    return;
  }

  // Add "thinking" reaction
  await addReaction(botToken, event.channel, event.ts, "eyes");

  // Load agent configuration
  const agentSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}`)
    .get();
  if (!agentSnap.exists) {
    await postSlackMessage(
      botToken,
      event.channel,
      "Sorry, this agent could not be found.",
      event.thread_ts || event.ts
    );
    return;
  }

  const agentData = agentSnap.data()!;

  // Load skills for system prompt injection
  const skillsSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/skills`)
    .get();
  const skills = skillsSnap.docs.map((doc) => ({
    name: doc.data().name as string,
    content: doc.data().content as string,
  }));

  // Build system prompt with skills
  let systemPrompt = agentData.systemPrompt as string || "";
  if (skills.length > 0) {
    const skillsXml = skills
      .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
      .join("\n");
    systemPrompt = `${systemPrompt}\n\n<skills>\n${skillsXml}\n</skills>`;
  }

  // Extract message text
  let messageText = event.text;

  // For app_mention, strip the bot mention prefix (e.g. "<@U12345> ")
  if (isAppMention) {
    const connectorSnap = await adminDb
      .doc(`users/${userId}/agents/${agentId}/connectors/slackConnection`)
      .get();
    const botUserId = connectorSnap.data()?.botUserId as string | undefined;
    if (botUserId) {
      messageText = messageText.replace(new RegExp(`<@${botUserId}>\\s*`), "");
    }
  }

  // Build message history from thread
  const messages: LLMMessage[] = [];

  if (event.thread_ts) {
    const threadHistory = await getThreadHistory(
      botToken,
      event.channel,
      event.thread_ts,
      agentData.botUserId as string | undefined
    );

    // Add thread messages (excluding the current one which comes last)
    for (const msg of threadHistory) {
      // Skip the current message if it appears in thread history
      if (msg.content === event.text && msg.role === "user") continue;
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Add the current message
  messages.push({
    role: "user",
    content: messageText,
  });

  // Run agent (synchronous — collect full response)
  let fullResponse = "";

  try {
    await runAgentWithTools(
      {
        provider: agentData.modelProvider as string || "anthropic",
        model: agentData.modelId as string || "claude-sonnet-4-20250514",
        systemPrompt,
        messages,
        userId,
        agentId,
        connectedRepos: (agentData.connectedRepos as string[]) || [],
      },
      {
        onToken: (text: string) => {
          fullResponse += text;
        },
        onDone: () => {
          // Agent finished — response collected in fullResponse
        },
        onError: (error: Error) => {
          console.error("[Slack Events] Agent error:", error.message);
          fullResponse = "Sorry, I encountered an error processing your request.";
        },
      }
    );
  } catch (err) {
    console.error("[Slack Events] runAgentWithTools threw:", err);
    fullResponse = "Sorry, I encountered an error processing your request.";
  }

  // Post response as threaded reply
  if (fullResponse) {
    await postSlackMessage(
      botToken,
      event.channel,
      fullResponse,
      event.thread_ts || event.ts
    );
  }

  // Add checkmark reaction to indicate completion
  await addReaction(botToken, event.channel, event.ts, "white_check_mark");
}

// --- Helper: get bot token from connector doc ---

async function getBotToken(
  userId: string,
  agentId: string
): Promise<string> {
  const snap = await adminDb
    .doc(`users/${userId}/agents/${agentId}/connectors/slackConnection`)
    .get();
  return (snap.data()?.botToken as string) || "";
}
