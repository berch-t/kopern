import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";

// --- WhatsApp Webhook Signature Verification ---

export function verifyWhatsAppSignature(
  rawBody: string,
  signature: string,
  appSecret: string
): boolean {
  if (!signature || !appSecret) return false;

  const expectedSignature = "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");

  if (expectedSignature.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
}

// --- WhatsApp Message Parsing ---

export interface WhatsAppInboundMessage {
  from: string;
  text: string;
  messageId: string;
  phoneNumberId: string;
  senderName: string;
  timestamp: string;
}

interface WhatsAppWebhookBody {
  object: string;
  entry?: {
    id: string;
    changes: {
      value: {
        messaging_product: string;
        metadata: { phone_number_id: string; display_phone_number: string };
        contacts?: { profile: { name: string }; wa_id: string }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }[];
        statuses?: unknown[];
      };
      field: string;
    }[];
  }[];
}

export function parseWhatsAppWebhook(body: WhatsAppWebhookBody): WhatsAppInboundMessage | null {
  if (body.object !== "whatsapp_business_account") return null;

  const entry = body.entry?.[0];
  if (!entry) return null;

  const change = entry.changes?.[0];
  if (!change || change.field !== "messages") return null;

  const value = change.value;

  // Skip status updates (delivery receipts, read receipts)
  if (value.statuses && value.statuses.length > 0 && (!value.messages || value.messages.length === 0)) {
    return null;
  }

  const message = value.messages?.[0];
  if (!message || message.type !== "text" || !message.text?.body) return null;

  const contact = value.contacts?.[0];

  return {
    from: message.from,
    text: message.text.body,
    messageId: message.id,
    phoneNumberId: value.metadata.phone_number_id,
    senderName: contact?.profile?.name || message.from,
    timestamp: message.timestamp,
  };
}

// --- WhatsApp Cloud API ---

const GRAPH_API = "https://graph.facebook.com/v21.0";
const MAX_MESSAGE_LENGTH = 4096;

export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<void> {
  const chunks = splitMessage(text, MAX_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    const res = await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: markdownToWhatsApp(chunk) },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`WhatsApp send failed (${res.status}): ${err}`);
    }
  }
}

export async function markWhatsAppMessageRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
): Promise<void> {
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    }),
  }).catch(() => {});
}

// --- Firestore Lookup ---

interface WhatsAppPhoneLookup {
  userId: string;
  agentId: string;
}

export async function lookupWhatsAppPhone(
  phoneNumberId: string
): Promise<WhatsAppPhoneLookup | null> {
  const snap = await adminDb.doc(`whatsappPhones/${phoneNumberId}`).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.userId || !data?.agentId) return null;

  return {
    userId: data.userId as string,
    agentId: data.agentId as string,
  };
}

export async function getWhatsAppAccessToken(
  userId: string,
  agentId: string
): Promise<string> {
  const snap = await adminDb
    .doc(`users/${userId}/agents/${agentId}/connectors/whatsapp`)
    .get();
  return (snap.data()?.accessToken as string) || "";
}

// --- Markdown Conversion ---

/**
 * Convert standard Markdown to WhatsApp format.
 * WhatsApp supports: *bold*, _italic_, ~strikethrough~, ```code```
 */
function markdownToWhatsApp(text: string): string {
  let result = text;

  // Preserve code blocks
  const codeBlocks: string[] = [];
  result = result.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  // Bold: **text** stays *text* (WhatsApp uses single *)
  result = result.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Italic: single _text_ stays _text_ (WhatsApp native)
  // Note: Markdown *text* → WhatsApp _text_
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "_$1_");

  // Headers: # Title → *Title* (bold)
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  // Horizontal rules
  result = result.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, "———");

  // Links: [text](url) → text (url)
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)");

  // Restore code blocks
  result = result.replace(/__CODEBLOCK_(\d+)__/g, (_, i) => `\`\`\`${codeBlocks[parseInt(i)]}\`\`\``);

  return result;
}

// --- Helpers ---

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt < maxLength * 0.5) splitAt = remaining.lastIndexOf(" ", maxLength);
    if (splitAt < maxLength * 0.3) splitAt = maxLength;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
