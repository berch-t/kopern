// Provider abstraction for calendar operations (Google Calendar API + Microsoft Graph Calendar)

import type { ServiceProvider } from "@/lib/firebase/firestore";

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO 8601
  end: string;
  location?: string;
  description?: string;
  attendees: string[];
  status: string;
}

export interface CreateEventParams {
  title: string;
  start: string; // ISO 8601
  end: string;
  description?: string;
  location?: string;
  attendees?: string[];
}

export interface TimeSlot {
  start: string;
  end: string;
  busy: boolean;
}

// ---------- GOOGLE CALENDAR ----------

async function googleListEvents(
  token: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: "50",
    singleEvents: "true",
    orderBy: "startTime",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Google Calendar list failed: ${res.status}`);
  const data = await res.json();

  return ((data.items || []) as Record<string, unknown>[]).map((e) => ({
    id: e.id as string,
    title: (e.summary as string) || "(No title)",
    start: (e.start as { dateTime?: string; date?: string })?.dateTime || (e.start as { date?: string })?.date || "",
    end: (e.end as { dateTime?: string; date?: string })?.dateTime || (e.end as { date?: string })?.date || "",
    location: (e.location as string) || undefined,
    description: (e.description as string) || undefined,
    attendees: ((e.attendees || []) as { email: string }[]).map((a) => a.email),
    status: (e.status as string) || "confirmed",
  }));
}

async function googleCheckAvailability(
  token: string,
  email: string,
  timeMin: string,
  timeMax: string
): Promise<TimeSlot[]> {
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: email }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Google freeBusy failed: ${res.status}`);
  const data = await res.json();
  const busy = (data.calendars?.[email]?.busy || []) as { start: string; end: string }[];
  return busy.map((b) => ({ start: b.start, end: b.end, busy: true }));
}

async function googleCreateEvent(
  token: string,
  params: CreateEventParams
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {
    summary: params.title,
    start: { dateTime: params.start },
    end: { dateTime: params.end },
  };
  if (params.description) body.description = params.description;
  if (params.location) body.location = params.location;
  if (params.attendees?.length) {
    body.attendees = params.attendees.map((email) => ({ email }));
  }

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google createEvent failed: ${res.status} ${err}`);
  }
  const e = await res.json();
  return {
    id: e.id,
    title: e.summary || params.title,
    start: e.start?.dateTime || params.start,
    end: e.end?.dateTime || params.end,
    location: e.location,
    description: e.description,
    attendees: (e.attendees || []).map((a: { email: string }) => a.email),
    status: e.status || "confirmed",
  };
}

async function googleUpdateEvent(
  token: string,
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {};
  if (params.title) body.summary = params.title;
  if (params.start) body.start = { dateTime: params.start };
  if (params.end) body.end = { dateTime: params.end };
  if (params.description) body.description = params.description;
  if (params.location) body.location = params.location;
  if (params.attendees?.length) body.attendees = params.attendees.map((email) => ({ email }));

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Google updateEvent failed: ${res.status}`);
  const e = await res.json();
  return {
    id: e.id,
    title: e.summary,
    start: e.start?.dateTime || "",
    end: e.end?.dateTime || "",
    location: e.location,
    description: e.description,
    attendees: (e.attendees || []).map((a: { email: string }) => a.email),
    status: e.status || "confirmed",
  };
}

async function googleCancelEvent(token: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok && res.status !== 410) throw new Error(`Google cancelEvent failed: ${res.status}`);
}

// ---------- MICROSOFT GRAPH CALENDAR ----------

async function graphListEvents(
  token: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: timeMin,
    endDateTime: timeMax,
    $top: "50",
    $orderby: "start/dateTime",
    $select: "id,subject,start,end,location,bodyPreview,attendees,showAs",
  });
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Graph calendarView failed: ${res.status}`);
  const data = await res.json();

  return ((data.value || []) as Record<string, unknown>[]).map((e) => ({
    id: e.id as string,
    title: (e.subject as string) || "(No title)",
    start: (e.start as { dateTime: string })?.dateTime || "",
    end: (e.end as { dateTime: string })?.dateTime || "",
    location: (e.location as { displayName?: string })?.displayName || undefined,
    description: (e.bodyPreview as string) || undefined,
    attendees: ((e.attendees || []) as { emailAddress: { address: string } }[]).map(
      (a) => a.emailAddress.address
    ),
    status: (e.showAs as string) || "busy",
  }));
}

async function graphCheckAvailability(
  token: string,
  email: string,
  timeMin: string,
  timeMax: string
): Promise<TimeSlot[]> {
  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/calendar/getSchedule",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedules: [email],
        startTime: { dateTime: timeMin, timeZone: "UTC" },
        endTime: { dateTime: timeMax, timeZone: "UTC" },
      }),
    }
  );
  if (!res.ok) throw new Error(`Graph getSchedule failed: ${res.status}`);
  const data = await res.json();
  const items = data.value?.[0]?.scheduleItems || [];
  return (items as { start: { dateTime: string }; end: { dateTime: string }; status: string }[]).map((s) => ({
    start: s.start.dateTime,
    end: s.end.dateTime,
    busy: s.status !== "free",
  }));
}

async function graphCreateEvent(
  token: string,
  params: CreateEventParams
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {
    subject: params.title,
    start: { dateTime: params.start, timeZone: "UTC" },
    end: { dateTime: params.end, timeZone: "UTC" },
  };
  if (params.description) body.body = { contentType: "HTML", content: params.description };
  if (params.location) body.location = { displayName: params.location };
  if (params.attendees?.length) {
    body.attendees = params.attendees.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    }));
  }

  const res = await fetch(
    "https://graph.microsoft.com/v1.0/me/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph createEvent failed: ${res.status} ${err}`);
  }
  const e = await res.json();
  return {
    id: e.id,
    title: e.subject || params.title,
    start: e.start?.dateTime || params.start,
    end: e.end?.dateTime || params.end,
    location: e.location?.displayName,
    description: e.bodyPreview,
    attendees: (e.attendees || []).map((a: { emailAddress: { address: string } }) => a.emailAddress.address),
    status: e.showAs || "busy",
  };
}

async function graphUpdateEvent(
  token: string,
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<CalendarEvent> {
  const body: Record<string, unknown> = {};
  if (params.title) body.subject = params.title;
  if (params.start) body.start = { dateTime: params.start, timeZone: "UTC" };
  if (params.end) body.end = { dateTime: params.end, timeZone: "UTC" };
  if (params.description) body.body = { contentType: "HTML", content: params.description };
  if (params.location) body.location = { displayName: params.location };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Graph updateEvent failed: ${res.status}`);
  const e = await res.json();
  return {
    id: e.id,
    title: e.subject,
    start: e.start?.dateTime || "",
    end: e.end?.dateTime || "",
    location: e.location?.displayName,
    description: e.bodyPreview,
    attendees: (e.attendees || []).map((a: { emailAddress: { address: string } }) => a.emailAddress.address),
    status: e.showAs || "busy",
  };
}

async function graphCancelEvent(token: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/events/${eventId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok && res.status !== 404) throw new Error(`Graph cancelEvent failed: ${res.status}`);
}

// ---------- UNIFIED INTERFACE ----------

export async function listEvents(
  provider: ServiceProvider,
  token: string,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  return provider === "google"
    ? googleListEvents(token, timeMin, timeMax)
    : graphListEvents(token, timeMin, timeMax);
}

export async function checkAvailability(
  provider: ServiceProvider,
  token: string,
  email: string,
  timeMin: string,
  timeMax: string
): Promise<TimeSlot[]> {
  return provider === "google"
    ? googleCheckAvailability(token, email, timeMin, timeMax)
    : graphCheckAvailability(token, email, timeMin, timeMax);
}

export async function createEvent(
  provider: ServiceProvider,
  token: string,
  params: CreateEventParams
): Promise<CalendarEvent> {
  return provider === "google"
    ? googleCreateEvent(token, params)
    : graphCreateEvent(token, params);
}

export async function updateEvent(
  provider: ServiceProvider,
  token: string,
  eventId: string,
  params: Partial<CreateEventParams>
): Promise<CalendarEvent> {
  return provider === "google"
    ? googleUpdateEvent(token, eventId, params)
    : graphUpdateEvent(token, eventId, params);
}

export async function cancelEvent(
  provider: ServiceProvider,
  token: string,
  eventId: string
): Promise<void> {
  return provider === "google"
    ? googleCancelEvent(token, eventId)
    : graphCancelEvent(token, eventId);
}
