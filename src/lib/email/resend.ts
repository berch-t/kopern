/**
 * Centralized email sending via Resend.
 * Replaces nodemailer + Gmail across all routes.
 *
 * Env: RESEND_API_KEY (required), EMAIL_FROM (optional, default contact@mail.kopern.ai)
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const DEFAULT_FROM = process.env.EMAIL_FROM || "Kopern <contact@mail.kopern.ai>";

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Send an email via Resend.
 * Returns { success, id, error }.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[Email] RESEND_API_KEY not configured, skipping email");
    return { success: false, error: "Email service not configured (missing RESEND_API_KEY)" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: opts.from || DEFAULT_FROM,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo,
    });

    if (error) {
      console.error("[Email] Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return { success: false, error: (err as Error).message };
  }
}

// ─── Pre-built email templates ──────────────────────────────────────

function wrapInTemplate(content: string): string {
  return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="margin: 0; color: #7c3aed;">Kopern</h2>
  </div>
  ${content}
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
  <p style="font-size: 12px; color: #9ca3af; text-align: center;">
    Sent by <a href="https://kopern.ai" style="color: #7c3aed;">Kopern</a>
  </p>
</div>`.trim();
}

/**
 * Send a grading alert email.
 */
export async function sendGradingAlert(to: string, suiteName: string, message: string) {
  return sendEmail({
    to,
    subject: `[Kopern] Grading Alert — ${suiteName}`,
    html: wrapInTemplate(`
      <h3 style="color: #ef4444;">Grading Alert</h3>
      <p style="white-space: pre-wrap;">${message}</p>
    `),
    text: message,
  });
}

/**
 * Send a thank-you email to a bug reporter.
 */
export async function sendThankYouEmail(to: string, subject: string, htmlBody: string) {
  return sendEmail({
    to,
    subject,
    html: wrapInTemplate(htmlBody),
    replyTo: "contact@mail.kopern.ai",
  });
}
