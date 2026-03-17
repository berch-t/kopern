// AutoResearch history — Firestore persistence for runs and iterations

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { reportUsageToStripe } from "@/lib/stripe/server";
import type {
  AutoResearchConfig,
  AutoResearchIteration,
  AutoResearchRun,
} from "./types";

// ---------------------------------------------------------------------------
// Create a new run record
// ---------------------------------------------------------------------------

export async function createRun(
  config: AutoResearchConfig
): Promise<string> {
  const ref = await adminDb
    .collection(`users/${config.userId}/agents/${config.agentId}/autoresearchRuns`)
    .add({
      mode: config.mode,
      suiteId: config.suiteId,
      status: "running",
      config: {
        maxIterations: config.maxIterations,
        targetScore: config.targetScore ?? null,
        maxTokenBudget: config.maxTokenBudget ?? null,
        mutationDimensions: config.mutationDimensions,
        strategy: config.strategy,
      },
      baselineScore: 0,
      bestScore: 0,
      bestIterationIndex: 0,
      totalTokensInput: 0,
      totalTokensOutput: 0,
      totalCost: 0,
      iterationCount: 0,
      startedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
  return ref.id;
}

// ---------------------------------------------------------------------------
// Log an iteration
// ---------------------------------------------------------------------------

export async function logIteration(
  userId: string,
  agentId: string,
  runId: string,
  iteration: AutoResearchIteration
): Promise<void> {
  const iterRef = adminDb
    .collection(`users/${userId}/agents/${agentId}/autoresearchRuns/${runId}/iterations`)
    .doc(String(iteration.index));

  await iterRef.set({
    index: iteration.index,
    configSnapshot: iteration.configSnapshot,
    gradingScore: iteration.gradingScore,
    criteriaBreakdown: iteration.criteriaBreakdown,
    delta: iteration.delta,
    status: iteration.status,
    description: iteration.description,
    tokensInput: iteration.tokensUsed.input,
    tokensOutput: iteration.tokensUsed.output,
    durationMs: iteration.durationMs,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update run-level aggregates
  const runRef = adminDb.doc(
    `users/${userId}/agents/${agentId}/autoresearchRuns/${runId}`
  );

  await runRef.update({
    iterationCount: FieldValue.increment(1),
    totalTokensInput: FieldValue.increment(iteration.tokensUsed.input),
    totalTokensOutput: FieldValue.increment(iteration.tokensUsed.output),
    ...(iteration.status === "keep" || iteration.status === "baseline"
      ? {
          bestScore: iteration.gradingScore,
          bestIterationIndex: iteration.index,
        }
      : {}),
  });
}

// ---------------------------------------------------------------------------
// Complete a run
// ---------------------------------------------------------------------------

export async function completeRun(
  userId: string,
  agentId: string,
  runId: string,
  run: AutoResearchRun
): Promise<void> {
  const runRef = adminDb.doc(
    `users/${userId}/agents/${agentId}/autoresearchRuns/${runId}`
  );

  await runRef.update({
    status: run.status,
    bestScore: run.bestScore,
    bestIterationIndex: run.bestIterationIndex,
    totalTokensInput: run.totalTokensUsed.input,
    totalTokensOutput: run.totalTokensUsed.output,
    totalCost: run.totalCost,
    completedAt: FieldValue.serverTimestamp(),
  });
}

// ---------------------------------------------------------------------------
// Track autoresearch usage in billing
// ---------------------------------------------------------------------------

export async function trackAutoresearchUsage(
  userId: string,
  agentId: string,
  provider: string,
  inputTokens: number,
  outputTokens: number,
  iterationsCount: number
): Promise<void> {
  if (!userId || !agentId) return;

  const yearMonth = getCurrentYearMonth();
  const cost = calculateTokenCost(provider, inputTokens, outputTokens);
  const ref = adminDb.doc(`users/${userId}/usage/${yearMonth}`);

  await ref.set(
    {
      inputTokens: FieldValue.increment(inputTokens),
      outputTokens: FieldValue.increment(outputTokens),
      totalCost: FieldValue.increment(cost),
      requestCount: FieldValue.increment(iterationsCount),
      autoresearchIterations: FieldValue.increment(iterationsCount),
    },
    { merge: true }
  );

  // Nested agent breakdown
  await ref.update({
    [`agentBreakdown.${agentId}.inputTokens`]: FieldValue.increment(inputTokens),
    [`agentBreakdown.${agentId}.outputTokens`]: FieldValue.increment(outputTokens),
    [`agentBreakdown.${agentId}.cost`]: FieldValue.increment(cost),
  });

  // Report to Stripe (fire-and-forget)
  reportUsageToStripe(userId, inputTokens, outputTokens, 0, iterationsCount).catch((err) => {
    console.warn("Stripe autoresearch usage report failed:", err);
  });
}

// ---------------------------------------------------------------------------
// Fail a run
// ---------------------------------------------------------------------------

export async function failRun(
  userId: string,
  agentId: string,
  runId: string,
  error: string
): Promise<void> {
  const runRef = adminDb.doc(
    `users/${userId}/agents/${agentId}/autoresearchRuns/${runId}`
  );
  await runRef.update({
    status: "error",
    completedAt: FieldValue.serverTimestamp(),
  });
}

function getCurrentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
