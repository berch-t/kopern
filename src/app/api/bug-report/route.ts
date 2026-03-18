import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const TO_EMAIL = "berchet.thomas@gmail.com";
// The user ID that owns the bug fixer agent (set in env or defaults to your account)
const BUG_FIXER_OWNER_ID = process.env.BUG_FIXER_OWNER_ID;
const BUG_FIXER_AGENT_ID = process.env.BUG_FIXER_AGENT_ID;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { severity, description, pageUrl, reporterEmail } = body as {
    severity: string;
    description: string;
    pageUrl?: string;
    reporterEmail?: string;
  };

  if (!severity || !description || description.trim().length < 10) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const severityLabel = severity.toUpperCase();

  // 1. Persist bug to Firestore (if owner configured)
  let bugId: string | null = null;
  if (BUG_FIXER_OWNER_ID) {
    try {
      const bugRef = await adminDb.collection(`users/${BUG_FIXER_OWNER_ID}/bugs`).add({
        severity: severity as "low" | "medium" | "high" | "critical",
        description: description.trim(),
        pageUrl: pageUrl || "",
        reporterEmail: reporterEmail || "",
        status: "new",
        agentId: BUG_FIXER_AGENT_ID || null,
        assignedAt: null,
        analysis: null,
        fixBranch: null,
        fixPrUrl: null,
        fixCommitSha: null,
        thankYouSent: false,
        notes: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      bugId = bugRef.id;
    } catch (err) {
      console.error("Failed to persist bug to Firestore:", err);
    }
  }

  // 2. Send email notification (keep existing behavior)
  if (GMAIL_USER && GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      });

      const html = `
        <h2>Bug Report</h2>
        <table style="border-collapse:collapse;font-family:sans-serif;">
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Severity</td>
            <td style="padding:4px 0;">${severityLabel}</td>
          </tr>
          <tr>
            <td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Page</td>
            <td style="padding:4px 0;">${pageUrl || "N/A"}</td>
          </tr>
          ${reporterEmail ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Reporter</td><td style="padding:4px 0;">${reporterEmail}</td></tr>` : ""}
          ${bugId ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Bug ID</td><td style="padding:4px 0;font-family:monospace;">${bugId}</td></tr>` : ""}
        </table>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5;" />
        <p style="white-space:pre-wrap;font-family:sans-serif;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        <hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5;" />
        <p style="color:#888;font-size:12px;">Sent from Kopern Bug Reporter</p>
      `;

      await transporter.sendMail({
        from: `"Kopern Bug Reporter" <${GMAIL_USER}>`,
        to: TO_EMAIL,
        subject: `[Kopern] [${severityLabel}] Bug Report${bugId ? ` #${bugId.slice(0, 8)}` : ""}`,
        html,
      });
    } catch (err) {
      console.error("Failed to send bug report email:", err);
      // Don't fail the request — bug is already persisted
    }
  }

  // 3. Auto-trigger bug fixer agent (fire-and-forget)
  if (BUG_FIXER_OWNER_ID && BUG_FIXER_AGENT_ID && bugId) {
    triggerBugFixer(BUG_FIXER_OWNER_ID, BUG_FIXER_AGENT_ID, bugId, description, severity).catch((err) =>
      console.error("Failed to trigger bug fixer:", err)
    );
  }

  return NextResponse.json({ ok: true, bugId });
}

/**
 * Fire-and-forget: trigger the bug fixer agent via internal chat API.
 * The agent will pick up the bug, analyze it, and create a PR.
 */
async function triggerBugFixer(
  userId: string,
  agentId: string,
  bugId: string,
  description: string,
  severity: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // We call the chat API internally with a system message describing the bug
  const triggerMessage = [
    `A new bug report has been submitted (Bug ID: ${bugId}).`,
    `Severity: ${severity.toUpperCase()}`,
    `Description: ${description}`,
    "",
    "Please:",
    "1. Update the bug status to 'analyzing' using update_bug_status",
    "2. Search the Kopern codebase to identify the root cause",
    "3. Create a fix branch, commit the fix, and create a pull request",
    "4. Update the bug with the PR URL and set status to 'awaiting_review'",
    "5. Send a warm thank-you email to the reporter if they provided their email",
  ].join("\n");

  await fetch(`${baseUrl}/api/agents/${agentId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      messages: [{ role: "user", content: triggerMessage }],
    }),
  });
}
