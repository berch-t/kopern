import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const TO_EMAIL = "berchet.thomas@gmail.com";

export async function POST(req: NextRequest) {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return NextResponse.json(
      { error: "Email service not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const { severity, description, pageUrl } = body as {
    severity: string;
    description: string;
    pageUrl?: string;
  };

  if (!severity || !description || description.trim().length < 10) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const severityLabel = severity.toUpperCase();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });

  const html = `
    <h2>🐛 Kopern Bug Report</h2>
    <table style="border-collapse:collapse;font-family:sans-serif;">
      <tr>
        <td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Severity</td>
        <td style="padding:4px 0;">${severityLabel}</td>
      </tr>
      <tr>
        <td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top;">Page</td>
        <td style="padding:4px 0;">${pageUrl || "N/A"}</td>
      </tr>
    </table>
    <hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5;" />
    <p style="white-space:pre-wrap;font-family:sans-serif;">${description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
    <hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5;" />
    <p style="color:#888;font-size:12px;">Sent from Kopern Bug Reporter</p>
  `;

  try {
    await transporter.sendMail({
      from: `"Kopern Bug Reporter" <${GMAIL_USER}>`,
      to: TO_EMAIL,
      subject: `[Kopern Bug] [${severityLabel}] Bug Report`,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to send bug report email:", err);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
