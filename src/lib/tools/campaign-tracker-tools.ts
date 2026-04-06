// Campaign tracker tools for the Inbox Watcher agent
// Admin-only — reads/updates the shared campaignEmails collection
// Provides CSV export for code_interpreter analysis

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { type ToolDefinition } from "@/lib/llm/client";

// --- Tool Definitions ---

export function getCampaignTrackerTools(): ToolDefinition[] {
  return [
    {
      name: "list_prospects",
      concurrencySafe: true,
      description:
        "List all prospects from the campaign database. Filter by status, campaign mode, or date range. Returns structured JSON with full prospect details.",
      input_schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["sent", "follow_up_sent", "replied", "interested", "not_interested", "meeting_booked", "converted", "bounced", "unsubscribed"],
            description: "Filter by prospect status",
          },
          campaign_mode: {
            type: "string",
            enum: ["promotion", "beta", "outreach"],
            description: "Filter by campaign type",
          },
          since: {
            type: "string",
            description: "Only prospects sent after this date (ISO format, e.g. 2026-04-01)",
          },
          limit: { type: "number", description: "Max results (default 50)" },
        },
      },
    },
    {
      name: "update_prospect",
      description:
        "Update a prospect's status, add tags, or log a reply. Use this when you detect a reply in the inbox or want to update tracking info.",
      input_schema: {
        type: "object",
        properties: {
          prospect_email: { type: "string", description: "Prospect email address (used to find the record)" },
          status: {
            type: "string",
            enum: ["follow_up_sent", "replied", "interested", "not_interested", "meeting_booked", "converted", "bounced", "unsubscribed"],
            description: "New status",
          },
          reply_summary: {
            type: "string",
            description: "Summary of the prospect's reply (stored for tracking)",
          },
          reply_date: {
            type: "string",
            description: "Date of the reply (ISO format)",
          },
          tags: {
            type: "array",
            items: { type: "string" },
            description: "Tags to add (e.g. 'hot_lead', 'technical', 'follow_up_needed')",
          },
          note: {
            type: "string",
            description: "Internal note about this prospect",
          },
        },
        required: ["prospect_email"],
      },
    },
    {
      name: "get_prospect_detail",
      concurrencySafe: true,
      description:
        "Get full details of a specific prospect by email, including all replies, tags, and history.",
      input_schema: {
        type: "object",
        properties: {
          prospect_email: { type: "string", description: "Prospect email address" },
        },
        required: ["prospect_email"],
      },
    },
    {
      name: "export_prospects_csv",
      concurrencySafe: true,
      description:
        "Export the campaign database as CSV string. Use this with code_interpreter for data analysis, charts, and reports. The CSV includes: company, email, status, campaign_mode, sent_date, reply_date, tags, follow_up_due.",
      input_schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["sent", "follow_up_sent", "replied", "interested", "not_interested", "meeting_booked", "converted", "bounced", "unsubscribed"],
            description: "Filter by status (optional — exports all if omitted)",
          },
          campaign_mode: {
            type: "string",
            enum: ["promotion", "beta", "outreach"],
            description: "Filter by campaign type (optional)",
          },
        },
      },
    },
    {
      name: "get_campaign_stats",
      concurrencySafe: true,
      description:
        "Get aggregate statistics for all campaigns: total sent, reply rate, conversion funnel, breakdown by campaign mode and status. Quick overview without needing code_interpreter.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
    {
      name: "get_follow_ups_due",
      concurrencySafe: true,
      description:
        "List prospects whose follow-up is due (sent 3+ days ago, still in 'sent' status). These need a follow-up email.",
      input_schema: {
        type: "object",
        properties: {},
      },
    },
  ];
}

// --- Tool Execution ---

export async function executeCampaignTrackerTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolName) {
      case "list_prospects":
        return await executeListProspects(args, userId);
      case "update_prospect":
        return await executeUpdateProspect(args, userId);
      case "get_prospect_detail":
        return await executeGetProspectDetail(args, userId);
      case "export_prospects_csv":
        return await executeExportCsv(args, userId);
      case "get_campaign_stats":
        return await executeGetStats(userId);
      case "get_follow_ups_due":
        return await executeGetFollowUpsDue(userId);
      default:
        return { result: `Unknown campaign tracker tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Campaign tracker error: ${(err as Error).message}`, isError: true };
  }
}

const TRACKER_TOOL_NAMES = new Set([
  "list_prospects", "update_prospect", "get_prospect_detail",
  "export_prospects_csv", "get_campaign_stats", "get_follow_ups_due",
]);
export function isCampaignTrackerTool(name: string): boolean {
  return TRACKER_TOOL_NAMES.has(name);
}

// --- Implementations ---

async function executeListProspects(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const limit = Math.min((args.limit as number) || 50, 100);

  let query: FirebaseFirestore.Query = adminDb
    .collection(`users/${userId}/campaignEmails`)
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (args.status) query = query.where("status", "==", args.status);
  if (args.campaign_mode) query = query.where("campaignMode", "==", args.campaign_mode);

  const snap = await query.get();
  if (snap.empty) return { result: "No prospects found.", isError: false };

  const prospects = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      company: data.company,
      email: data.to,
      status: data.status,
      campaignMode: data.campaignMode,
      subject: data.subject,
      sentAt: data.sentAt,
      followUpDue: data.followUpDue,
      replies: data.replies?.length || 0,
      tags: data.tags || [],
    };
  });

  // Filter by date client-side if 'since' provided (Firestore can't combine orderBy + where on different fields easily)
  let filtered = prospects;
  if (args.since) {
    const sinceDate = new Date(args.since as string).toISOString();
    filtered = prospects.filter((p) => p.sentAt >= sinceDate);
  }

  return { result: JSON.stringify(filtered, null, 2), isError: false };
}

async function executeUpdateProspect(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const email = args.prospect_email as string;
  if (!email) return { result: "Missing required: prospect_email", isError: true };

  // Find prospect by email
  const snap = await adminDb
    .collection(`users/${userId}/campaignEmails`)
    .where("to", "==", email)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return { result: `No prospect found with email: ${email}`, isError: true };

  const docRef = snap.docs[0].ref;
  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (args.status) updates.status = args.status;
  if (args.tags) updates.tags = FieldValue.arrayUnion(...(args.tags as string[]));
  if (args.note) updates.notes = FieldValue.arrayUnion(args.note as string);

  if (args.reply_summary || args.reply_date) {
    updates.replies = FieldValue.arrayUnion({
      summary: args.reply_summary || "",
      date: args.reply_date || new Date().toISOString(),
      loggedAt: new Date().toISOString(),
    });
  }

  await docRef.update(updates);

  const updatedFields = Object.keys(updates).filter((k) => k !== "updatedAt");
  return {
    result: `Prospect ${email} updated: ${updatedFields.join(", ")}`,
    isError: false,
  };
}

async function executeGetProspectDetail(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const email = args.prospect_email as string;
  if (!email) return { result: "Missing required: prospect_email", isError: true };

  const snap = await adminDb
    .collection(`users/${userId}/campaignEmails`)
    .where("to", "==", email)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return { result: `No prospect found with email: ${email}`, isError: true };

  const data = snap.docs[0].data();
  return {
    result: JSON.stringify(
      {
        id: snap.docs[0].id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.(),
      },
      null,
      2
    ),
    isError: false,
  };
}

async function executeExportCsv(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  let query: FirebaseFirestore.Query = adminDb
    .collection(`users/${userId}/campaignEmails`)
    .orderBy("createdAt", "desc");

  if (args.status) query = query.where("status", "==", args.status);
  if (args.campaign_mode) query = query.where("campaignMode", "==", args.campaign_mode);

  const snap = await query.get();
  if (snap.empty) return { result: "No prospects to export.", isError: false };

  const headers = "company,email,status,campaign_mode,subject,sent_date,follow_up_due,reply_count,reply_dates,tags";
  const rows = snap.docs.map((d) => {
    const data = d.data();
    const replies = data.replies || [];
    const replyDates = replies.map((r: { date?: string }) => r.date || "").join(";");
    const tags = (data.tags || []).join(";");
    return [
      csvEscape(data.company || ""),
      csvEscape(data.to || ""),
      data.status || "",
      data.campaignMode || "",
      csvEscape(data.subject || ""),
      (data.sentAt || "").slice(0, 10),
      (data.followUpDue || "").slice(0, 10),
      replies.length,
      csvEscape(replyDates),
      csvEscape(tags),
    ].join(",");
  });

  return {
    result: [headers, ...rows].join("\n"),
    isError: false,
  };
}

async function executeGetStats(
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const snap = await adminDb
    .collection(`users/${userId}/campaignEmails`)
    .get();

  if (snap.empty) {
    return { result: JSON.stringify({ total: 0, message: "No campaigns yet." }), isError: false };
  }

  const stats = {
    total: snap.size,
    byStatus: {} as Record<string, number>,
    byCampaignMode: {} as Record<string, number>,
    replyRate: 0,
    conversionFunnel: {
      sent: 0,
      replied: 0,
      interested: 0,
      meeting_booked: 0,
      converted: 0,
    },
    followUpsDue: 0,
    averageDaysToReply: null as number | null,
  };

  const now = new Date();
  const replyDelays: number[] = [];

  for (const doc of snap.docs) {
    const data = doc.data();
    const status = data.status || "sent";

    // By status
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // By campaign mode
    const mode = data.campaignMode || "unknown";
    stats.byCampaignMode[mode] = (stats.byCampaignMode[mode] || 0) + 1;

    // Funnel
    if (status === "sent" || status === "follow_up_sent") stats.conversionFunnel.sent++;
    if (["replied", "interested", "meeting_booked", "converted"].includes(status)) {
      stats.conversionFunnel.replied++;
      stats.conversionFunnel.sent++;
    }
    if (["interested", "meeting_booked", "converted"].includes(status)) stats.conversionFunnel.interested++;
    if (["meeting_booked", "converted"].includes(status)) stats.conversionFunnel.meeting_booked++;
    if (status === "converted") stats.conversionFunnel.converted++;

    // Follow-ups due
    if (status === "sent" && data.followUpDue) {
      const dueDate = new Date(data.followUpDue);
      if (dueDate <= now) stats.followUpsDue++;
    }

    // Reply delays
    const replies = data.replies || [];
    if (replies.length > 0 && data.sentAt) {
      const sentDate = new Date(data.sentAt);
      const firstReply = new Date(replies[0].date || replies[0].loggedAt);
      const days = (firstReply.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24);
      if (days > 0 && days < 365) replyDelays.push(days);
    }
  }

  stats.replyRate = stats.total > 0
    ? Math.round((stats.conversionFunnel.replied / stats.total) * 100)
    : 0;

  stats.averageDaysToReply = replyDelays.length > 0
    ? Math.round((replyDelays.reduce((a, b) => a + b, 0) / replyDelays.length) * 10) / 10
    : null;

  return { result: JSON.stringify(stats, null, 2), isError: false };
}

async function executeGetFollowUpsDue(
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const now = new Date().toISOString();

  const snap = await adminDb
    .collection(`users/${userId}/campaignEmails`)
    .where("status", "==", "sent")
    .get();

  const due = snap.docs
    .filter((d) => {
      const followUpDue = d.data().followUpDue;
      return followUpDue && followUpDue <= now;
    })
    .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        company: data.company,
        email: data.to,
        subject: data.subject,
        sentAt: data.sentAt,
        followUpDue: data.followUpDue,
        daysSinceSent: Math.floor(
          (Date.now() - new Date(data.sentAt).getTime()) / (1000 * 60 * 60 * 24)
        ),
      };
    })
    .sort((a, b) => a.daysSinceSent - b.daysSinceSent);

  if (due.length === 0) {
    return { result: "No follow-ups due. All prospects have been followed up or replied.", isError: false };
  }

  return { result: JSON.stringify(due, null, 2), isError: false };
}

// --- Helpers ---

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
