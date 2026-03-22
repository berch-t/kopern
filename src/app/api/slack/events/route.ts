import { NextRequest, NextResponse, after } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import type { LLMMessage } from "@/lib/llm/client";
import { logAppError } from "@/lib/errors/logger";
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
    logAppError({
      code: "SLACK_NOT_CONFIGURED",
      message: "SLACK_SIGNING_SECRET env var is missing",
      source: "slack_events",
      severity: "critical",
    });
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const timestamp = request.headers.get("X-Slack-Request-Timestamp") || "";
  const signature = request.headers.get("X-Slack-Signature") || "";

  if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
    logAppError({
      code: "SLACK_SIGNATURE_INVALID",
      message: "Slack request signature verification failed",
      source: "slack_events",
      severity: "warning",
      metadata: { timestamp },
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as SlackEventPayload;

  // Handle URL verification challenge (Slack setup)
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // For event callbacks, return 200 immediately then process async
  if (body.type === "event_callback") {
    logAppError({
      code: "SLACK_EVENT_RECEIVED",
      message: `Received Slack event: ${body.event?.type ?? "unknown"} from team ${body.team_id}`,
      source: "slack_events",
      severity: "warning",
      metadata: { eventType: body.event?.type, channelType: body.event?.channel_type, teamId: body.team_id, channel: body.event?.channel, text: body.event?.text?.slice(0, 100) },
    });

    // Use after() to keep the serverless function alive after responding 200
    after(async () => {
      try {
        await processSlackEvent(body);
      } catch (err) {
        logAppError({
          code: "SLACK_PROCESSING_FAILED",
          message: (err as Error).message,
          source: "slack_events",
          severity: "critical",
          metadata: { teamId: body.team_id, error: err },
          userNotified: false,
        });
      }
    });

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

// --- Async event processing ---

async function processSlackEvent(body: SlackEventPayload): Promise<void> {
  const event = body.event;
  if (!event) {
    logAppError({
      code: "SLACK_NO_EVENT",
      message: "Slack event payload has no event field",
      source: "slack_events",
      severity: "warning",
      metadata: { type: body.type, teamId: body.team_id },
    });
    return;
  }

  // Only handle app_mention and direct message events
  const isAppMention = event.type === "app_mention";
  const isDirectMessage = event.type === "message" && event.channel_type === "im";
  if (!isAppMention && !isDirectMessage) {
    logAppError({
      code: "SLACK_EVENT_IGNORED",
      message: `Ignoring Slack event type: ${event.type} (channel_type: ${event.channel_type ?? "none"})`,
      source: "slack_events",
      severity: "warning",
      metadata: { eventType: event.type, channelType: event.channel_type, teamId: body.team_id },
    });
    return;
  }

  // Skip bot messages to prevent loops
  if (event.bot_id) {
    logAppError({
      code: "SLACK_BOT_MESSAGE_SKIPPED",
      message: `Skipping bot message (bot_id: ${event.bot_id})`,
      source: "slack_events",
      severity: "warning",
      metadata: { botId: event.bot_id, teamId: body.team_id, channel: event.channel },
    });
    return;
  }

  // Lookup which agent handles this Slack team
  const teamLookup = await lookupSlackTeam(body.team_id);
  if (!teamLookup) {
    logAppError({
      code: "SLACK_NO_AGENT_MAPPED",
      message: `No agent mapped for Slack team ${body.team_id}. The workspace may need to be reconnected.`,
      source: "slack_events",
      severity: "error",
      metadata: { teamId: body.team_id, channel: event.channel },
      userNotified: false,
    });
    return;
  }

  const { userId, agentId } = teamLookup;

  // Check plan limits (skip for admin)
  const ADMIN_UIDS = (process.env.NEXT_PUBLIC_ADMIN_UID ?? "").split(",").filter(Boolean);
  const isAdmin = ADMIN_UIDS.includes(userId);

  // Get bot token early — needed for all error messages
  const botToken = await getBotToken(userId, agentId);

  if (!isAdmin) {
    const planCheck = await checkPlanLimits(userId, "connectors");
    if (!planCheck.allowed) {
      logAppError({
        code: "PLAN_LIMIT_EXCEEDED",
        message: `Slack connector blocked: ${planCheck.reason}`,
        source: "plan_guard",
        userId,
        agentId,
        metadata: { plan: planCheck.plan, check: "connectors" },
        userNotified: true,
      });
      if (botToken) {
        await postSlackMessage(
          botToken,
          event.channel,
          `⚠️ **Plan limit reached** — ${planCheck.reason}\n\nUpgrade your Kopern plan to continue using this agent via Slack.`,
          event.thread_ts || event.ts
        );
      }
      return;
    }

    // Also check token limits
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      logAppError({
        code: "PLAN_LIMIT_EXCEEDED",
        message: `Slack connector blocked: ${tokenCheck.reason}`,
        source: "plan_guard",
        userId,
        agentId,
        metadata: { plan: tokenCheck.plan, check: "tokens" },
        userNotified: true,
      });
      if (botToken) {
        await postSlackMessage(
          botToken,
          event.channel,
          `⚠️ **Token limit reached** — ${tokenCheck.reason}\n\nUpgrade your Kopern plan or wait for the next billing cycle.`,
          event.thread_ts || event.ts
        );
      }
      return;
    }
  }

  if (!botToken) {
    logAppError({
      code: "SLACK_NO_BOT_TOKEN",
      message: `No bot token found for user ${userId} / agent ${agentId}. The Slack connection may need to be re-established.`,
      source: "slack_events",
      severity: "error",
      userId,
      agentId,
      userNotified: false,
    });
    return;
  }

  // Add "thinking" reaction
  await addReaction(botToken, event.channel, event.ts, "eyes");

  // Load agent configuration
  const agentSnap = await adminDb
    .doc(`users/${userId}/agents/${agentId}`)
    .get();
  if (!agentSnap.exists) {
    logAppError({
      code: "SLACK_AGENT_NOT_FOUND",
      message: `Agent ${agentId} not found for user ${userId}. It may have been deleted.`,
      source: "slack_events",
      userId,
      agentId,
      userNotified: true,
    });
    await postSlackMessage(
      botToken,
      event.channel,
      "⚠️ **Agent not found** — The agent connected to this Slack workspace may have been deleted. Please reconnect a different agent from the Kopern dashboard.",
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
          logAppError({
            code: "SLACK_AGENT_ERROR",
            message: error.message,
            source: "slack_events",
            userId,
            agentId,
            metadata: { channel: event.channel },
            userNotified: true,
          });
          fullResponse = `⚠️ **Agent error** — ${error.message}\n\nPlease try again or check the agent configuration in the Kopern dashboard.`;
        },
      }
    );
  } catch (err) {
    logAppError({
      code: "SLACK_AGENT_CRASH",
      message: (err as Error).message,
      source: "slack_events",
      severity: "critical",
      userId,
      agentId,
      metadata: { channel: event.channel, error: err },
      userNotified: true,
    });
    fullResponse = `⚠️ **Unexpected error** — Something went wrong while processing your message. The Kopern team has been notified.\n\nError: ${(err as Error).message}`;
  }

  // Post response as threaded reply
  if (fullResponse) {
    const postResult = await postSlackMessage(
      botToken,
      event.channel,
      fullResponse,
      event.thread_ts || event.ts
    );
    if (!postResult.ok) {
      logAppError({
        code: "SLACK_POST_FAILED",
        message: `Failed to post Slack message: ${postResult.error}`,
        source: "slack_events",
        userId,
        agentId,
        metadata: { channel: event.channel, slackError: postResult.error },
        userNotified: false,
      });
    }
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
