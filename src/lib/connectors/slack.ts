import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";

// --- Slack Request Signature Verification ---

export function verifySlackSignature(
  signingSecret: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  // Reject if timestamp is older than 5 minutes (replay attack protection)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// --- Slack Web API Helpers ---

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
  messages?: SlackMessage[];
}

interface SlackMessage {
  type: string;
  user?: string;
  bot_id?: string;
  text: string;
  ts: string;
  thread_ts?: string;
}

export async function postSlackMessage(
  botToken: string,
  channel: string,
  text: string,
  threadTs?: string
): Promise<SlackApiResponse> {
  const payload: Record<string, string> = { channel, text };
  if (threadTs) {
    payload.thread_ts = threadTs;
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  return res.json() as Promise<SlackApiResponse>;
}

export async function addReaction(
  botToken: string,
  channel: string,
  timestamp: string,
  reaction: string
): Promise<void> {
  await fetch("https://slack.com/api/reactions.add", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${botToken}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ channel, timestamp, name: reaction }),
  }).catch(() => {
    // Reaction failures are non-critical — no logging needed
  });
}

export interface ThreadMessage {
  role: "user" | "assistant";
  content: string;
}

export async function getThreadHistory(
  botToken: string,
  channel: string,
  threadTs: string,
  botUserId?: string
): Promise<ThreadMessage[]> {
  const url = new URL("https://slack.com/api/conversations.replies");
  url.searchParams.set("channel", channel);
  url.searchParams.set("ts", threadTs);
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${botToken}`,
    },
  });

  const data = (await res.json()) as SlackApiResponse;
  if (!data.ok || !data.messages) return [];

  return data.messages.map((msg): ThreadMessage => {
    const isBot = msg.bot_id !== undefined || (botUserId !== undefined && msg.user === botUserId);
    return {
      role: isBot ? "assistant" : "user",
      content: msg.text,
    };
  });
}

// --- Firestore Index Lookup ---

interface SlackTeamLookup {
  userId: string;
  agentId: string;
}

export async function lookupSlackTeam(
  teamId: string
): Promise<SlackTeamLookup | null> {
  const snap = await adminDb.doc(`slackTeams/${teamId}`).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.userId || !data?.agentId) return null;

  return {
    userId: data.userId as string,
    agentId: data.agentId as string,
  };
}
