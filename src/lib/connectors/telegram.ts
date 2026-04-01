import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";

// --- Telegram Webhook Verification ---

export function verifyTelegramSecret(
  request: Request,
  expectedSecret: string
): boolean {
  const headerSecret = request.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
  if (!headerSecret || !expectedSecret) return false;
  if (headerSecret.length !== expectedSecret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(expectedSecret));
}

// --- Telegram Update Parsing ---

export interface TelegramUpdate {
  chatId: number;
  text: string;
  messageId: number;
  replyToMessageId?: number;
  senderName: string;
  senderId: number;
  isGroup: boolean;
  chatType: string;
}

interface TelegramWebhookBody {
  update_id: number;
  message?: {
    message_id: number;
    from?: { id: number; first_name: string; last_name?: string; username?: string; is_bot?: boolean };
    chat: { id: number; type: string; title?: string };
    text?: string;
    reply_to_message?: { message_id: number; from?: { is_bot?: boolean } };
  };
}

export function parseTelegramUpdate(body: TelegramWebhookBody): TelegramUpdate | null {
  const msg = body.message;
  if (!msg || !msg.text) return null;

  // Skip bot messages to prevent loops
  if (msg.from?.is_bot) return null;

  return {
    chatId: msg.chat.id,
    text: msg.text,
    messageId: msg.message_id,
    replyToMessageId: msg.reply_to_message?.message_id,
    senderName: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || "User",
    senderId: msg.from?.id ?? 0,
    isGroup: msg.chat.type === "group" || msg.chat.type === "supergroup",
    chatType: msg.chat.type,
  };
}

// --- Telegram Bot API ---

const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

export async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
  replyToMessageId?: number
): Promise<void> {
  // Split long messages (Telegram limit: 4096 chars)
  const chunks = splitMessage(text, MAX_MESSAGE_LENGTH);

  for (const chunk of chunks) {
    const htmlText = markdownToTelegramHTML(chunk);
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: htmlText,
      parse_mode: "HTML",
    };
    if (replyToMessageId) {
      payload.reply_parameters = { message_id: replyToMessageId };
    }

    const res = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      // Fallback: send as plain text (strip all markdown)
      const fallback: Record<string, unknown> = {
        chat_id: chatId,
        text: stripMarkdown(chunk),
      };
      if (replyToMessageId) {
        fallback.reply_parameters = { message_id: replyToMessageId };
      }
      await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fallback),
      });
    }

    // Only reply to the first chunk
    replyToMessageId = undefined;
  }
}

export async function sendTelegramChatAction(
  botToken: string,
  chatId: number,
  action: "typing" = "typing"
): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken}/sendChatAction`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, action }),
  }).catch(() => {});
}

export async function setTelegramWebhook(
  botToken: string,
  webhookUrl: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secretToken,
      allowed_updates: ["message"],
    }),
  });
  return res.json() as Promise<{ ok: boolean; description?: string }>;
}

export async function deleteTelegramWebhook(botToken: string): Promise<void> {
  await fetch(`${TELEGRAM_API}/bot${botToken}/deleteWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

export async function getTelegramBotInfo(
  botToken: string
): Promise<{ username: string; firstName: string } | null> {
  const res = await fetch(`${TELEGRAM_API}/bot${botToken}/getMe`);
  const data = await res.json() as { ok: boolean; result?: { username: string; first_name: string } };
  if (!data.ok || !data.result) return null;
  return { username: data.result.username, firstName: data.result.first_name };
}

// --- Firestore Lookup ---

interface TelegramBotLookup {
  userId: string;
  agentId: string;
  botToken: string;
  secretToken: string;
}

export async function lookupTelegramBot(
  secretToken: string
): Promise<TelegramBotLookup | null> {
  // Lookup by the secret token hash (stored in top-level index)
  const hash = crypto.createHash("sha256").update(secretToken).digest("hex");
  const snap = await adminDb.doc(`telegramBots/${hash}`).get();
  if (!snap.exists) return null;

  const data = snap.data();
  if (!data?.userId || !data?.agentId || !data?.botToken) return null;

  return {
    userId: data.userId as string,
    agentId: data.agentId as string,
    botToken: data.botToken as string,
    secretToken,
  };
}

// --- Markdown → Telegram HTML Conversion ---

/**
 * Convert standard Markdown to Telegram HTML format.
 * HTML is much more forgiving than MarkdownV2 — no need to escape special chars.
 * Telegram supports: <b>, <i>, <code>, <pre>, <a>, <s>, <u>, <blockquote>
 */
function markdownToTelegramHTML(text: string): string {
  let result = text;

  // Preserve code blocks — convert to <pre>
  const codeBlocks: string[] = [];
  result = result.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const escaped = escapeHTML(code.trim());
    const pre = lang ? `<pre><code class="language-${lang}">${escaped}</code></pre>` : `<pre>${escaped}</pre>`;
    codeBlocks.push(pre);
    return `__CODEBLOCK_${codeBlocks.length - 1}__`;
  });

  // Preserve inline code — convert to <code>
  const inlineCodes: string[] = [];
  result = result.replace(/`([^`]+)`/g, (_, code) => {
    inlineCodes.push(`<code>${escapeHTML(code)}</code>`);
    return `__INLINE_${inlineCodes.length - 1}__`;
  });

  // Tables → readable key-value text (Telegram has no table support)
  result = result.replace(/^\|(.+)\|\s*\n\|[-| :]+\|\s*\n((?:\|.+\|\s*\n?)*)/gm, (_, header, body) => {
    const headers = header.split("|").map((h: string) => h.trim()).filter(Boolean);
    const rows = body.trim().split("\n").filter(Boolean);
    let out = "";
    for (const row of rows) {
      const cells = row.split("|").map((c: string) => c.trim()).filter(Boolean);
      const parts: string[] = [];
      for (let i = 0; i < cells.length; i++) {
        if (headers[i] && cells[i]) {
          parts.push(`<b>${escapeHTML(headers[i])}</b>: ${escapeHTML(cells[i])}`);
        } else if (cells[i]) {
          parts.push(escapeHTML(cells[i]));
        }
      }
      out += parts.join(" | ") + "\n";
    }
    return out;
  });

  // Bold: **text** → <b>text</b>
  result = result.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");

  // Italic: *text* → <i>text</i> (but not inside <b> tags)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<i>$1</i>");

  // Strikethrough: ~~text~~ → <s>text</s>
  result = result.replace(/~~(.+?)~~/g, "<s>$1</s>");

  // Headers: # Title → bold line
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "\n<b>$1</b>");

  // Links: [text](url) → <a href="url">text</a>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Blockquotes: > text → <blockquote>text</blockquote>
  result = result.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // Horizontal rules
  result = result.replace(/^-{3,}$/gm, "———");
  result = result.replace(/^_{3,}$/gm, "———");

  // Restore inline code
  result = result.replace(/__INLINE_(\d+)__/g, (_, i) => inlineCodes[parseInt(i)]);

  // Restore code blocks
  result = result.replace(/__CODEBLOCK_(\d+)__/g, (_, i) => codeBlocks[parseInt(i)]);

  // Clean up excessive blank lines
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

/** Escape HTML special chars */
function escapeHTML(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Strip all markdown formatting for plain text fallback */
function stripMarkdown(text: string): string {
  let result = text;
  // Remove code blocks (keep content)
  result = result.replace(/```\w*\n?([\s\S]*?)```/g, "$1");
  // Remove inline code backticks
  result = result.replace(/`([^`]+)`/g, "$1");
  // Remove bold/italic
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/\*(.+?)\*/g, "$1");
  result = result.replace(/~~(.+?)~~/g, "$1");
  // Remove headers
  result = result.replace(/^#{1,6}\s+/gm, "");
  // Remove links (keep text)
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  // Remove blockquote markers
  result = result.replace(/^>\s+/gm, "");
  // Tables: remove pipes, keep content
  result = result.replace(/^\|[-| :]+\|\s*$/gm, "");
  result = result.replace(/^\|(.+)\|$/gm, (_, content) =>
    content.split("|").map((c: string) => c.trim()).filter(Boolean).join(" | ")
  );
  // Remove horizontal rules
  result = result.replace(/^-{3,}$/gm, "———");
  return result.trim();
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

    // Try to split at a newline near the limit
    let splitAt = remaining.lastIndexOf("\n", maxLength);
    if (splitAt < maxLength * 0.5) {
      // No good newline found, split at space
      splitAt = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitAt < maxLength * 0.3) {
      // No good space found, hard split
      splitAt = maxLength;
    }

    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).trimStart();
  }

  return chunks;
}
