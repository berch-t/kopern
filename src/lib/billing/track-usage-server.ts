// Server-side usage tracking using Firebase Admin SDK
// Uses FieldValue.increment() for atomic updates — no read-before-write race conditions

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateTokenCost } from "./pricing";
import { reportUsageToStripe } from "@/lib/stripe/server";

/** Check if user has given functional consent (server-side, Admin SDK) */
async function checkFunctionalConsentServer(userId: string): Promise<boolean> {
  try {
    const snap = await adminDb.doc(`users/${userId}/consent/preferences`).get();
    if (!snap.exists) return false;
    return snap.data()?.functional === true;
  } catch {
    return false;
  }
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Track token usage for an agent interaction.
 * Called from API routes (chat, grading, teams, pipelines).
 * Writes to: users/{userId}/usage/{yearMonth}
 */
export async function trackUsageServer(
  userId: string,
  agentId: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
  gradingRuns: number = 0,
  modelId?: string
): Promise<void> {
  if (!userId || !agentId) return;

  const yearMonth = getCurrentYearMonth();
  const cost = calculateTokenCost(provider, inputTokens, outputTokens, modelId);
  const ref = adminDb.doc(`users/${userId}/usage/${yearMonth}`);

  // First ensure the doc exists with top-level counters
  const topLevelData: Record<string, unknown> = {
    inputTokens: FieldValue.increment(inputTokens),
    outputTokens: FieldValue.increment(outputTokens),
    totalCost: FieldValue.increment(cost),
    requestCount: FieldValue.increment(1),
  };
  if (gradingRuns > 0) {
    topLevelData.gradingRuns = FieldValue.increment(gradingRuns);
  }
  await ref.set(topLevelData, { merge: true });

  // Then use update() with dot-notation for nested agentBreakdown
  // update() correctly interprets dots as nested field paths
  await ref.update({
    [`agentBreakdown.${agentId}.inputTokens`]: FieldValue.increment(inputTokens),
    [`agentBreakdown.${agentId}.outputTokens`]: FieldValue.increment(outputTokens),
    [`agentBreakdown.${agentId}.cost`]: FieldValue.increment(cost),
  });

  // Report to Stripe for metered billing (fire-and-forget, non-blocking)
  reportUsageToStripe(userId, inputTokens, outputTokens, gradingRuns).catch((err) => {
    console.warn("Stripe usage report failed (non-blocking):", err);
  });
}

/**
 * Track a session event and update session metrics.
 * Writes to: users/{userId}/agents/{agentId}/sessions/{sessionId}
 */
export async function updateSessionMetrics(
  userId: string,
  agentId: string,
  sessionId: string,
  metrics: {
    inputTokens: number;
    outputTokens: number;
    cost: number;
    toolCallCount: number;
    messageCount: number;
  }
): Promise<void> {
  if (!userId || !agentId || !sessionId) return;

  const ref = adminDb.doc(`users/${userId}/agents/${agentId}/sessions/${sessionId}`);

  await ref.set(
    {
      totalTokensIn: FieldValue.increment(metrics.inputTokens),
      totalTokensOut: FieldValue.increment(metrics.outputTokens),
      totalCost: FieldValue.increment(metrics.cost),
      toolCallCount: FieldValue.increment(metrics.toolCallCount),
      messageCount: FieldValue.increment(metrics.messageCount),
    },
    { merge: true }
  );
}

/**
 * Create a new session record. Returns the session ID.
 */
export type SessionSource = "playground" | "widget" | "webhook" | "slack" | "mcp" | "grading" | "autoresearch" | "pipeline" | "team";

export async function createSessionServer(
  userId: string,
  agentId: string,
  data: {
    purpose?: string | null;
    modelUsed: string;
    providerUsed: string;
    source?: SessionSource;
  }
): Promise<string> {
  const ref = await adminDb
    .collection(`users/${userId}/agents/${agentId}/sessions`)
    .add({
      purpose: data.purpose ?? null,
      source: data.source ?? "playground",
      startedAt: FieldValue.serverTimestamp(),
      endedAt: null,
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalCost: 0,
      toolCallCount: 0,
      subAgentCallCount: 0,
      messageCount: 0,
      modelUsed: data.modelUsed,
      providerUsed: data.providerUsed,
      events: [],
    });
  return ref.id;
}

/**
 * Append events to session (messages, tool calls, etc.)
 * Gated behind functional consent — session event details are optional analytics.
 */
export async function appendSessionEvents(
  userId: string,
  agentId: string,
  sessionId: string,
  events: { type: string; data: Record<string, unknown> }[]
): Promise<void> {
  if (!userId || !agentId || !sessionId || events.length === 0) return;

  // Check functional consent — session events are detailed analytics
  const hasConsent = await checkFunctionalConsentServer(userId);
  if (!hasConsent) return;

  const ref = adminDb.doc(`users/${userId}/agents/${agentId}/sessions/${sessionId}`);
  const now = new Date();
  const timestampedEvents = events.map((e) => ({
    ...e,
    timestamp: now,
  }));

  // arrayUnion doesn't support serverTimestamp(), so we read-then-write
  const snap = await ref.get();
  const existing = (snap.data()?.events as unknown[]) || [];
  await ref.update({
    events: [...existing, ...timestampedEvents],
  });
}

/**
 * End a session (set endedAt timestamp).
 */
export async function endSessionServer(
  userId: string,
  agentId: string,
  sessionId: string
): Promise<void> {
  await adminDb
    .doc(`users/${userId}/agents/${agentId}/sessions/${sessionId}`)
    .update({ endedAt: FieldValue.serverTimestamp() });
}
