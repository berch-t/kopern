// Service Connector tools — email + calendar as agent tools
// Pattern: getXTools / isXTool / executeXTool (same as bug-tools, memory-tools, etc.)

import type { ToolDefinition } from "@/lib/llm/client";
import { resolveAccessToken, checkAndIncrementDailyLimit } from "@/lib/services/oauth-tokens";
import { listEmails, sendEmail } from "@/lib/services/email-provider";
import {
  listEvents,
  checkAvailability,
  createEvent,
  updateEvent,
  cancelEvent,
} from "@/lib/services/calendar-provider";
import { adminDb } from "@/lib/firebase/admin";
import type { ServiceProvider } from "@/lib/firebase/firestore";

// --- Constants ---

const EMAIL_DAILY_SEND_LIMIT = 20;
const CALENDAR_DAILY_CREATE_LIMIT = 10;

// --- Tool definitions ---

const EMAIL_TOOLS: ToolDefinition[] = [
  {
    name: "read_emails",
    concurrencySafe: true,
    description:
      "Read recent emails from the user's mailbox. Supports search queries (sender, subject, keywords). Returns subject, sender, date, and snippet for each email.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            'Search query to filter emails (e.g. "from:client@example.com", "subject:devis", "is:unread"). Leave empty for recent inbox.',
        },
        max_results: {
          type: "number",
          description: "Maximum number of emails to return (1-20, default 5).",
        },
      },
    },
  },
  {
    name: "send_email",
    description:
      "Send an email on behalf of the user. Use for confirmations, quotes, follow-ups. Limited to 20 sends per day.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string", description: "Email subject line." },
        body: {
          type: "string",
          description: "Email body (HTML supported). Keep professional and concise.",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "reply_email",
    description:
      "Reply to a specific email thread. The reply will appear in the same conversation thread.",
    input_schema: {
      type: "object",
      properties: {
        message_id: {
          type: "string",
          description: "The ID of the email to reply to (from read_emails results).",
        },
        thread_id: {
          type: "string",
          description: "The thread ID (from read_emails results, for Gmail threading).",
        },
        body: {
          type: "string",
          description: "Reply body (HTML supported).",
        },
      },
      required: ["message_id", "body"],
    },
  },
];

const CALENDAR_TOOLS: ToolDefinition[] = [
  {
    name: "list_events",
    concurrencySafe: true,
    description:
      "List calendar events within a date range. Returns event title, start/end times, location, and attendees.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start of the range (ISO 8601, e.g. '2026-04-01T00:00:00Z').",
        },
        end_date: {
          type: "string",
          description: "End of the range (ISO 8601, e.g. '2026-04-07T23:59:59Z').",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "check_availability",
    concurrencySafe: true,
    description:
      "Check free/busy time slots for a given date range. Use before creating events to avoid conflicts.",
    input_schema: {
      type: "object",
      properties: {
        start_date: {
          type: "string",
          description: "Start of the range (ISO 8601).",
        },
        end_date: {
          type: "string",
          description: "End of the range (ISO 8601).",
        },
      },
      required: ["start_date", "end_date"],
    },
  },
  {
    name: "create_event",
    description:
      "Create a new calendar event. Limited to 10 creations per day. Cannot create events in the past.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title." },
        start: {
          type: "string",
          description: "Event start time (ISO 8601, e.g. '2026-04-02T14:00:00+02:00').",
        },
        end: {
          type: "string",
          description: "Event end time (ISO 8601).",
        },
        description: {
          type: "string",
          description: "Event description or notes.",
        },
        location: { type: "string", description: "Event location." },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Email addresses of attendees to invite.",
        },
      },
      required: ["title", "start", "end"],
    },
  },
  {
    name: "update_event",
    description:
      "Update an existing calendar event (change time, title, description, etc.).",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "The ID of the event to update (from list_events results).",
        },
        title: { type: "string", description: "New event title." },
        start: { type: "string", description: "New start time (ISO 8601)." },
        end: { type: "string", description: "New end time (ISO 8601)." },
        description: { type: "string", description: "New description." },
        location: { type: "string", description: "New location." },
      },
      required: ["event_id"],
    },
  },
  {
    name: "cancel_event",
    description: "Cancel (delete) a calendar event.",
    input_schema: {
      type: "object",
      properties: {
        event_id: {
          type: "string",
          description: "The ID of the event to cancel (from list_events results).",
        },
      },
      required: ["event_id"],
    },
  },
];

const ALL_SERVICE_TOOL_NAMES = new Set([
  ...EMAIL_TOOLS.map((t) => t.name),
  ...CALENDAR_TOOLS.map((t) => t.name),
]);

// --- Public API ---

export function getEmailTools(): ToolDefinition[] {
  return EMAIL_TOOLS;
}

export function getCalendarTools(): ToolDefinition[] {
  return CALENDAR_TOOLS;
}

export function isServiceTool(name: string): boolean {
  return ALL_SERVICE_TOOL_NAMES.has(name);
}

/**
 * Resolve which provider(s) the user has connected.
 * Returns the first connected provider or null.
 */
async function resolveProvider(
  userId: string
): Promise<{ provider: ServiceProvider; token: string; email: string } | null> {
  // Try Google first (most common), then Microsoft
  for (const p of ["google", "microsoft"] as ServiceProvider[]) {
    const result = await resolveAccessToken(userId, p);
    if (result) return { provider: p, token: result.token, email: result.email };
  }
  return null;
}

export async function executeServiceTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<{ result: string; isError: boolean }> {
  const conn = await resolveProvider(userId);
  if (!conn) {
    return {
      result:
        "No email/calendar service connected. Ask the user to connect their Google or Microsoft account in Settings > Service Connectors.",
      isError: true,
    };
  }

  try {
    switch (toolName) {
      // --- Email tools ---
      case "read_emails": {
        const query = (args.query as string) || "";
        const maxResults = Math.min(Math.max((args.max_results as number) || 5, 1), 20);
        const emails = await listEmails(conn.provider, conn.token, query, maxResults);
        if (emails.length === 0) return { result: "No emails found matching your query.", isError: false };
        const formatted = emails
          .map(
            (e, i) =>
              `${i + 1}. **${e.subject}**\n   From: ${e.from}\n   Date: ${e.date}\n   ID: ${e.id}${e.threadId ? ` | Thread: ${e.threadId}` : ""}\n   ${e.snippet}`
          )
          .join("\n\n");
        return { result: `Found ${emails.length} email(s):\n\n${formatted}`, isError: false };
      }

      case "send_email": {
        const to = args.to as string;
        const subject = args.subject as string;
        const body = args.body as string;
        if (!to || !subject || !body) {
          return { result: "Missing required fields: to, subject, body.", isError: true };
        }
        const allowed = await checkAndIncrementDailyLimit(
          userId, conn.provider, "dailySendCount", EMAIL_DAILY_SEND_LIMIT
        );
        if (!allowed) {
          return {
            result: `Daily email send limit reached (${EMAIL_DAILY_SEND_LIMIT}/day). Try again tomorrow.`,
            isError: true,
          };
        }
        const msgId = await sendEmail(conn.provider, conn.token, { to, subject, body }, conn.email);
        return { result: `Email sent successfully to ${to}. Message ID: ${msgId}`, isError: false };
      }

      case "reply_email": {
        const messageId = args.message_id as string;
        const threadId = args.thread_id as string | undefined;
        const body = args.body as string;
        if (!messageId || !body) {
          return { result: "Missing required fields: message_id, body.", isError: true };
        }
        const allowed = await checkAndIncrementDailyLimit(
          userId, conn.provider, "dailySendCount", EMAIL_DAILY_SEND_LIMIT
        );
        if (!allowed) {
          return {
            result: `Daily email send limit reached (${EMAIL_DAILY_SEND_LIMIT}/day). Try again tomorrow.`,
            isError: true,
          };
        }
        const msgId = await sendEmail(
          conn.provider,
          conn.token,
          { to: "", subject: "", body, replyToMessageId: messageId, threadId },
          conn.email
        );
        return { result: `Reply sent successfully. Message ID: ${msgId}`, isError: false };
      }

      // --- Calendar tools ---
      case "list_events": {
        const startDate = args.start_date as string;
        const endDate = args.end_date as string;
        if (!startDate || !endDate) {
          return { result: "Missing required fields: start_date, end_date.", isError: true };
        }
        const events = await listEvents(conn.provider, conn.token, startDate, endDate);
        if (events.length === 0) return { result: "No events found in this date range.", isError: false };
        const formatted = events
          .map(
            (e, i) =>
              `${i + 1}. **${e.title}**\n   ${e.start} → ${e.end}\n   ID: ${e.id}${e.location ? `\n   Location: ${e.location}` : ""}${e.attendees.length ? `\n   Attendees: ${e.attendees.join(", ")}` : ""}`
          )
          .join("\n\n");
        return { result: `Found ${events.length} event(s):\n\n${formatted}`, isError: false };
      }

      case "check_availability": {
        const startDate = args.start_date as string;
        const endDate = args.end_date as string;
        if (!startDate || !endDate) {
          return { result: "Missing required fields: start_date, end_date.", isError: true };
        }
        const slots = await checkAvailability(conn.provider, conn.token, conn.email, startDate, endDate);
        if (slots.length === 0) {
          return { result: `No busy slots found between ${startDate} and ${endDate}. The entire range is free.`, isError: false };
        }
        const formatted = slots
          .map((s, i) => `${i + 1}. ${s.start} → ${s.end} (${s.busy ? "BUSY" : "FREE"})`)
          .join("\n");
        return { result: `Busy slots:\n${formatted}\n\nAll other times in the range are free.`, isError: false };
      }

      case "create_event": {
        const title = args.title as string;
        const start = args.start as string;
        const end = args.end as string;
        if (!title || !start || !end) {
          return { result: "Missing required fields: title, start, end.", isError: true };
        }
        // Guard: no events in the past
        if (new Date(start).getTime() < Date.now()) {
          return { result: "Cannot create events in the past.", isError: true };
        }
        const allowed = await checkAndIncrementDailyLimit(
          userId, conn.provider, "dailyCreateCount", CALENDAR_DAILY_CREATE_LIMIT
        );
        if (!allowed) {
          return {
            result: `Daily event creation limit reached (${CALENDAR_DAILY_CREATE_LIMIT}/day). Try again tomorrow.`,
            isError: true,
          };
        }
        const event = await createEvent(conn.provider, conn.token, {
          title,
          start,
          end,
          description: args.description as string | undefined,
          location: args.location as string | undefined,
          attendees: args.attendees as string[] | undefined,
        });
        return {
          result: `Event created: "${event.title}" on ${event.start} → ${event.end}. ID: ${event.id}`,
          isError: false,
        };
      }

      case "update_event": {
        const eventId = args.event_id as string;
        if (!eventId) return { result: "Missing required field: event_id.", isError: true };
        const updated = await updateEvent(conn.provider, conn.token, eventId, {
          title: args.title as string | undefined,
          start: args.start as string | undefined,
          end: args.end as string | undefined,
          description: args.description as string | undefined,
          location: args.location as string | undefined,
        });
        return {
          result: `Event updated: "${updated.title}" — ${updated.start} → ${updated.end}. ID: ${updated.id}`,
          isError: false,
        };
      }

      case "cancel_event": {
        const eventId = args.event_id as string;
        if (!eventId) return { result: "Missing required field: event_id.", isError: true };
        await cancelEvent(conn.provider, conn.token, eventId);
        return { result: `Event ${eventId} cancelled successfully.`, isError: false };
      }

      default:
        return { result: `Unknown service tool: ${toolName}`, isError: true };
    }
  } catch (err) {
    return { result: `Service tool error: ${(err as Error).message}`, isError: true };
  }
}
