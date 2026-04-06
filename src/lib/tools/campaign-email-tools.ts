// Campaign email tools for cold outreach agents
// Admin-only — uses Resend (not user OAuth), logs to agent memory
// Daily limit enforced via Firestore counter

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { type ToolDefinition } from "@/lib/llm/client";

// --- Tool Definitions ---

export function getCampaignEmailTools(): ToolDefinition[] {
  return [
    {
      name: "send_campaign_email",
      description:
        "Send a cold outreach email via Resend (from contact@mail.kopern.ai). Each email requires human approval before sending. Use this after the Editor has validated the email. The email is logged to agent memory for follow-up tracking.",
      input_schema: {
        type: "object",
        properties: {
          to: { type: "string", description: "Recipient email address" },
          subject: { type: "string", description: "Email subject line (< 50 chars recommended)" },
          body: { type: "string", description: "Email body in plain text (not HTML)" },
          company: { type: "string", description: "Recipient company name (for logging)" },
          campaign_mode: {
            type: "string",
            enum: ["promotion", "beta", "outreach"],
            description: "Campaign type (for tracking)",
          },
          reply_to: {
            type: "string",
            description: "Reply-to address (default: contact@mail.kopern.ai)",
          },
        },
        required: ["to", "subject", "body", "company"],
      },
    },
    {
      name: "check_campaign_quota",
      concurrencySafe: true,
      description:
        "Check how many campaign emails have been sent today and the remaining daily quota.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "list_campaign_log",
      concurrencySafe: true,
      description:
        "List recent campaign emails sent by this agent (from memory). Shows recipient, subject, date, and status.",
      input_schema: {
        type: "object",
        properties: {
          limit: { type: "number", description: "Max results (default 20)" },
        },
      },
    },
  ];
}

// --- Tool Execution ---

const DAILY_LIMIT = 20;

export async function executeCampaignEmailTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolName) {
      case "send_campaign_email":
        return await executeSendCampaignEmail(args, userId, agentId);
      case "check_campaign_quota":
        return await executeCheckQuota(userId);
      case "list_campaign_log":
        return await executeListLog(userId, agentId, args);
      default:
        return { result: `Unknown campaign email tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Campaign email tool error: ${(err as Error).message}`, isError: true };
  }
}

const CAMPAIGN_TOOL_NAMES = new Set(["send_campaign_email", "check_campaign_quota", "list_campaign_log"]);
export function isCampaignEmailTool(name: string): boolean {
  return CAMPAIGN_TOOL_NAMES.has(name);
}

// --- Implementations ---

async function executeSendCampaignEmail(
  args: Record<string, unknown>,
  userId: string,
  agentId: string
): Promise<{ result: string; isError: boolean }> {
  const to = args.to as string;
  const subject = args.subject as string;
  const body = args.body as string;
  const company = args.company as string;
  const campaignMode = (args.campaign_mode as string) || "promotion";
  const replyTo = (args.reply_to as string) || "contact@mail.kopern.ai";

  if (!to || !subject || !body || !company) {
    return { result: "Missing required: to, subject, body, company", isError: true };
  }

  // Check daily limit
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const quotaRef = adminDb.doc(`users/${userId}/campaignQuota/${today}`);
  const quotaSnap = await quotaRef.get();
  const sent = quotaSnap.exists ? (quotaSnap.data()?.count ?? 0) : 0;

  if (sent >= DAILY_LIMIT) {
    return {
      result: `Daily campaign email limit reached (${DAILY_LIMIT}/${DAILY_LIMIT}). Try again tomorrow.`,
      isError: true,
    };
  }

  // Send via Resend
  const { sendEmail } = await import("@/lib/email/resend");
  const result = await sendEmail({
    to,
    subject,
    html: formatPlainTextAsHtml(body),
    text: body,
    replyTo,
  });

  if (!result.success) {
    return { result: `Email send failed: ${result.error}`, isError: true };
  }

  // Increment daily counter
  await quotaRef.set(
    { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  // Log to shared campaign database (user-level, cross-agent)
  const now = new Date();
  const prospectData = {
    to,
    company,
    subject,
    body,
    campaignMode,
    sentAt: now.toISOString(),
    sentBy: agentId,
    resendId: result.id,
    status: "sent" as const,
    followUpDue: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    replies: [],
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await adminDb.collection(`users/${userId}/campaignEmails`).add(prospectData);

  // Also log to agent memory for quick recall
  const memoryKey = `campaign_${to}_${today}`;
  await adminDb.collection(`users/${userId}/agents/${agentId}/memory`).doc(memoryKey).set({
    key: memoryKey,
    value: JSON.stringify({ to, company, subject, campaignMode, sentAt: now.toISOString(), resendId: result.id, status: "sent" }),
    category: "campaign_email",
    accessCount: 0,
    lastAccessedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    result: `Email sent to ${to} (${company}). Subject: "${subject}". Resend ID: ${result.id}. Logged to memory as "${memoryKey}". Follow-up due: ${new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)}. Daily quota: ${sent + 1}/${DAILY_LIMIT}.`,
    isError: false,
  };
}

async function executeCheckQuota(
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const quotaSnap = await adminDb.doc(`users/${userId}/campaignQuota/${today}`).get();
  const sent = quotaSnap.exists ? (quotaSnap.data()?.count ?? 0) : 0;

  return {
    result: JSON.stringify({
      date: today,
      sent,
      remaining: Math.max(0, DAILY_LIMIT - sent),
      dailyLimit: DAILY_LIMIT,
    }),
    isError: false,
  };
}

async function executeListLog(
  userId: string,
  agentId: string,
  args: Record<string, unknown>
): Promise<{ result: string; isError: boolean }> {
  const limit = Math.min((args.limit as number) || 20, 50);

  const snap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/memory`)
    .where("category", "==", "campaign_email")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  if (snap.empty) {
    return { result: "No campaign emails sent yet.", isError: false };
  }

  const logs = snap.docs.map((d) => {
    try {
      return JSON.parse(d.data().value);
    } catch {
      return { key: d.id, raw: d.data().value };
    }
  });

  return { result: JSON.stringify(logs, null, 2), isError: false };
}

// --- Helpers ---

function formatPlainTextAsHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const withLinks = escaped.replace(
    /(https?:\/\/[^\s<]+)/g,
    '<a href="$1" style="color: #7c3aed;">$1</a>'
  );
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6; color: #1a1a1a; max-width: 600px;">${withLinks.replace(/\n/g, "<br>")}</div>`;
}
