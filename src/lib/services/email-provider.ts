// Provider abstraction for email operations (Gmail API + Microsoft Graph API)

import type { ServiceProvider } from "@/lib/firebase/firestore";

export interface EmailMessage {
  id: string;
  threadId?: string;
  from: string;
  to: string[];
  subject: string;
  snippet: string;
  body: string;
  date: string;
  isRead: boolean;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
  threadId?: string;
}

// ---------- GMAIL ----------

async function gmailListMessages(
  token: string,
  query: string,
  maxResults: number
): Promise<EmailMessage[]> {
  const params = new URLSearchParams({
    q: query || "is:inbox",
    maxResults: String(Math.min(maxResults, 20)),
  });
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!listRes.ok) throw new Error(`Gmail list failed: ${listRes.status}`);
  const listData = await listRes.json();
  const messageIds = (listData.messages || []) as { id: string; threadId: string }[];

  const messages: EmailMessage[] = [];
  for (const { id } of messageIds.slice(0, maxResults)) {
    const msgRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!msgRes.ok) continue;
    const msg = await msgRes.json();
    const headers = (msg.payload?.headers || []) as { name: string; value: string }[];
    const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

    messages.push({
      id: msg.id,
      threadId: msg.threadId,
      from: getHeader("From"),
      to: getHeader("To").split(",").map((s: string) => s.trim()),
      subject: getHeader("Subject"),
      snippet: msg.snippet || "",
      body: msg.snippet || "", // Metadata mode — snippet only for token efficiency
      date: getHeader("Date"),
      isRead: !msg.labelIds?.includes("UNREAD"),
    });
  }
  return messages;
}

async function gmailSendMessage(
  token: string,
  params: SendEmailParams,
  fromEmail: string
): Promise<string> {
  const lines = [
    `From: ${fromEmail}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    params.body,
  ];

  if (params.replyToMessageId) {
    lines.splice(3, 0, `In-Reply-To: ${params.replyToMessageId}`);
    lines.splice(4, 0, `References: ${params.replyToMessageId}`);
  }

  const raw = Buffer.from(lines.join("\r\n")).toString("base64url");

  const url = params.threadId
    ? `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`
    : `https://gmail.googleapis.com/gmail/v1/users/me/messages/send`;

  const body: Record<string, string> = { raw };
  if (params.threadId) body.threadId = params.threadId;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.id as string;
}

// ---------- MICROSOFT GRAPH ----------

async function graphListMessages(
  token: string,
  query: string,
  maxResults: number
): Promise<EmailMessage[]> {
  const params = new URLSearchParams({
    $top: String(Math.min(maxResults, 20)),
    $orderby: "receivedDateTime desc",
    $select: "id,conversationId,from,toRecipients,subject,bodyPreview,receivedDateTime,isRead",
  });
  if (query) {
    params.set("$search", `"${query}"`);
  }

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Graph messages failed: ${res.status}`);
  const data = await res.json();

  return ((data.value || []) as Record<string, unknown>[]).map((m) => ({
    id: m.id as string,
    threadId: m.conversationId as string,
    from: (m.from as { emailAddress: { address: string } })?.emailAddress?.address || "",
    to: ((m.toRecipients || []) as { emailAddress: { address: string } }[]).map((r) => r.emailAddress.address),
    subject: (m.subject as string) || "",
    snippet: (m.bodyPreview as string) || "",
    body: (m.bodyPreview as string) || "",
    date: (m.receivedDateTime as string) || "",
    isRead: (m.isRead as boolean) || false,
  }));
}

async function graphSendMessage(
  token: string,
  params: SendEmailParams
): Promise<string> {
  const endpoint = params.replyToMessageId
    ? `https://graph.microsoft.com/v1.0/me/messages/${params.replyToMessageId}/reply`
    : "https://graph.microsoft.com/v1.0/me/sendMail";

  const body = params.replyToMessageId
    ? { comment: params.body }
    : {
        message: {
          subject: params.subject,
          body: { contentType: "HTML", content: params.body },
          toRecipients: [{ emailAddress: { address: params.to } }],
        },
      };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph send failed: ${res.status} ${err}`);
  }
  return params.replyToMessageId || "sent";
}

// ---------- UNIFIED INTERFACE ----------

export async function listEmails(
  provider: ServiceProvider,
  token: string,
  query: string,
  maxResults: number
): Promise<EmailMessage[]> {
  return provider === "google"
    ? gmailListMessages(token, query, maxResults)
    : graphListMessages(token, query, maxResults);
}

export async function sendEmail(
  provider: ServiceProvider,
  token: string,
  params: SendEmailParams,
  fromEmail: string
): Promise<string> {
  return provider === "google"
    ? gmailSendMessage(token, params, fromEmail)
    : graphSendMessage(token, params);
}
