// Bug management tools for the Bug Fixer agent
// Server-side only — uses Firebase Admin SDK + nodemailer

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { type ToolDefinition } from "@/lib/llm/client";
import type { BugStatus } from "@/lib/firebase/firestore";

// --- Tool Definitions ---

export function getBugTools(): ToolDefinition[] {
  return [
    {
      name: "list_bugs",
      description:
        "List bugs from the tracking database. Filter by status to find new bugs to analyze, bugs being fixed, or bugs awaiting review.",
      input_schema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["new", "analyzing", "fixing", "awaiting_review", "fixed", "closed", "wont_fix"],
            description: "Filter by status (optional — returns all if omitted)",
          },
          limit: {
            type: "number",
            description: "Max results (default 20)",
          },
        },
      },
    },
    {
      name: "get_bug",
      description: "Get full details of a specific bug by ID, including analysis, fix branch, PR URL, and notes.",
      input_schema: {
        type: "object",
        properties: {
          bugId: { type: "string", description: "Bug document ID" },
        },
        required: ["bugId"],
      },
    },
    {
      name: "update_bug_status",
      description:
        "Update a bug's status and optionally add analysis notes, fix branch, PR URL, or commit SHA. Use this to track progress through the bug lifecycle.",
      input_schema: {
        type: "object",
        properties: {
          bugId: { type: "string", description: "Bug document ID" },
          status: {
            type: "string",
            enum: ["analyzing", "fixing", "awaiting_review", "fixed", "closed", "wont_fix"],
            description: "New status",
          },
          analysis: { type: "string", description: "Root cause analysis (set when status = analyzing)" },
          fixBranch: { type: "string", description: "Branch name where the fix is being developed" },
          fixPrUrl: { type: "string", description: "Pull request URL" },
          fixCommitSha: { type: "string", description: "Commit SHA of the fix" },
          note: { type: "string", description: "Additional note to append to the bug's notes array" },
        },
        required: ["bugId", "status"],
      },
    },
    {
      name: "send_thank_you_email",
      description:
        "Send a warm, personalized thank-you email to the bug reporter. Use this after creating a PR or fixing the bug. The email should be friendly, appreciative, and inform them of the fix status.",
      input_schema: {
        type: "object",
        properties: {
          bugId: { type: "string", description: "Bug document ID (to fetch reporter email)" },
          subject: { type: "string", description: "Email subject line" },
          message: { type: "string", description: "Email body in HTML (be warm, friendly, and professional)" },
        },
        required: ["bugId", "subject", "message"],
      },
    },
  ];
}

// --- Tool Execution ---

export async function executeBugTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  try {
    switch (toolName) {
      case "list_bugs":
        return await executeListBugs(args, userId);
      case "get_bug":
        return await executeGetBug(args, userId);
      case "update_bug_status":
        return await executeUpdateBugStatus(args, userId);
      case "send_thank_you_email":
        return await executeSendThankYou(args, userId);
      default:
        return { result: `Unknown bug tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Bug tool error: ${(err as Error).message}`, isError: true };
  }
}

const BUG_TOOL_NAMES = new Set(["list_bugs", "get_bug", "update_bug_status", "send_thank_you_email"]);
export function isBugTool(name: string): boolean {
  return BUG_TOOL_NAMES.has(name);
}

// --- Implementations ---

async function executeListBugs(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const status = args.status as BugStatus | undefined;
  const limit = Math.min((args.limit as number) || 20, 50);

  let query = adminDb.collection(`users/${userId}/bugs`).orderBy("createdAt", "desc").limit(limit);
  if (status) {
    query = query.where("status", "==", status);
  }

  const snap = await query.get();
  if (snap.empty) {
    return { result: status ? `No bugs with status "${status}".` : "No bugs found.", isError: false };
  }

  const bugs = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      severity: data.severity,
      status: data.status,
      description: data.description?.slice(0, 120),
      reporterEmail: data.reporterEmail || "anonymous",
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || "unknown",
      fixPrUrl: data.fixPrUrl || null,
    };
  });

  return { result: JSON.stringify(bugs, null, 2), isError: false };
}

async function executeGetBug(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const bugId = args.bugId as string;
  if (!bugId) return { result: "Missing required: bugId", isError: true };

  const snap = await adminDb.doc(`users/${userId}/bugs/${bugId}`).get();
  if (!snap.exists) return { result: `Bug ${bugId} not found.`, isError: true };

  const data = snap.data()!;
  return {
    result: JSON.stringify(
      {
        id: snap.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.(),
        assignedAt: data.assignedAt?.toDate?.()?.toISOString?.() || null,
      },
      null,
      2
    ),
    isError: false,
  };
}

async function executeUpdateBugStatus(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const bugId = args.bugId as string;
  const status = args.status as BugStatus;
  if (!bugId || !status) return { result: "Missing required: bugId, status", isError: true };

  const updates: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (args.analysis) updates.analysis = args.analysis;
  if (args.fixBranch) updates.fixBranch = args.fixBranch;
  if (args.fixPrUrl) updates.fixPrUrl = args.fixPrUrl;
  if (args.fixCommitSha) updates.fixCommitSha = args.fixCommitSha;
  if (args.note) updates.notes = FieldValue.arrayUnion(args.note);
  if (status === "analyzing") updates.assignedAt = FieldValue.serverTimestamp();

  await adminDb.doc(`users/${userId}/bugs/${bugId}`).update(updates);

  return { result: `Bug ${bugId} updated to "${status}".`, isError: false };
}

async function executeSendThankYou(
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const bugId = args.bugId as string;
  const subject = args.subject as string;
  const message = args.message as string;
  if (!bugId || !subject || !message) return { result: "Missing required: bugId, subject, message", isError: true };

  // Get reporter email from bug doc
  const bugSnap = await adminDb.doc(`users/${userId}/bugs/${bugId}`).get();
  if (!bugSnap.exists) return { result: `Bug ${bugId} not found.`, isError: true };

  const reporterEmail = bugSnap.data()?.reporterEmail;
  if (!reporterEmail) return { result: "No reporter email on this bug — cannot send thank-you.", isError: false };

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return { result: "Email service not configured (missing GMAIL_USER/GMAIL_APP_PASSWORD).", isError: true };

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `"Kopern" <${gmailUser}>`,
    to: reporterEmail,
    subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="margin: 0; color: #7c3aed;">Kopern</h2>
        </div>
        ${message}
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          This email was sent by the Kopern Bug Fixer Agent.
        </p>
      </div>
    `,
  });

  // Mark thank-you as sent
  await adminDb.doc(`users/${userId}/bugs/${bugId}`).update({
    thankYouSent: true,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { result: `Thank-you email sent to ${reporterEmail}.`, isError: false };
}
