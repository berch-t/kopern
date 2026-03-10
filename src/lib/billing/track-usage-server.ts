// Server-side usage tracking using Firebase Admin SDK
// Uses FieldValue.increment() for atomic updates — no read-before-write race conditions

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateTokenCost } from "./pricing";
import { reportUsageToStripe } from "@/lib/stripe/server";

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
  gradingRuns: number = 0
): Promise<void> {
  if (!userId || !agentId) return;

  const yearMonth = getCurrentYearMonth();
  const cost = calculateTokenCost(provider, inputTokens, outputTokens);
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
export async function createSessionServer(
  userId: string,
  agentId: string,
  data: {
    purpose?: string | null;
    modelUsed: string;
    providerUsed: string;
  }
): Promise<string> {
  const ref = await adminDb
    .collection(`users/${userId}/agents/${agentId}/sessions`)
    .add({
      purpose: data.purpose ?? null,
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
 */
export async function appendSessionEvents(
  userId: string,
  agentId: string,
  sessionId: string,
  events: { type: string; data: Record<string, unknown> }[]
): Promise<void> {
  if (!userId || !agentId || !sessionId || events.length === 0) return;

  const ref = adminDb.doc(`users/${userId}/agents/${agentId}/sessions/${sessionId}`);
  const timestampedEvents = events.map((e) => ({
    ...e,
    timestamp: FieldValue.serverTimestamp(),
  }));

  await ref.update({
    events: FieldValue.arrayUnion(...timestampedEvents),
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
