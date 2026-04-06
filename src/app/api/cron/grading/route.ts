import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { GradingSuiteDoc, GradingRunDoc, AgentDoc } from "@/lib/firebase/firestore";

// Vercel Cron hits this endpoint on schedule (e.g. every 5 minutes)
// It scans all grading suites with schedule.enabled = true and runs due ones

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sends Authorization header)
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { userId: string; agentId: string; suiteId: string; status: string }[] = [];

  try {
    // Scan all users → agents → gradingSuites where schedule.enabled = true
    const usersSnap = await adminDb.collection("users").listDocuments();

    for (const userRef of usersSnap) {
      const agentsSnap = await userRef.collection("agents").listDocuments();

      for (const agentRef of agentsSnap) {
        const suitesSnap = await agentRef
          .collection("gradingSuites")
          .where("schedule.enabled", "==", true)
          .get();

        for (const suiteDoc of suitesSnap.docs) {
          const suite = suiteDoc.data() as GradingSuiteDoc;
          if (!suite.schedule?.enabled || !suite.schedule?.cronExpression) continue;

          // Check if due: nextRunAt <= now OR nextRunAt not set
          const nextRun = suite.schedule.nextRunAt?.toDate?.();
          if (nextRun && nextRun > now) continue;

          // Mark as running (update nextRunAt to prevent double-execution)
          const nextInterval = computeNextRun(suite.schedule.cronExpression, now);
          await suiteDoc.ref.update({
            "schedule.lastRunAt": FieldValue.serverTimestamp(),
            "schedule.nextRunAt": nextInterval,
          });

          // Trigger grading run via internal call
          try {
            await triggerGradingRun(
              userRef.id,
              agentRef.id,
              suiteDoc.id,
              agentRef,
              suiteDoc,
            );
            results.push({
              userId: userRef.id,
              agentId: agentRef.id,
              suiteId: suiteDoc.id,
              status: "triggered",
            });
          } catch (err) {
            results.push({
              userId: userRef.id,
              agentId: agentRef.id,
              suiteId: suiteDoc.id,
              status: `error: ${String(err)}`,
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      runsTriggered: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Trigger a grading run (server-side, no SSE)
// ---------------------------------------------------------------------------

async function triggerGradingRun(
  userId: string,
  agentId: string,
  suiteId: string,
  agentRef: FirebaseFirestore.DocumentReference,
  suiteDocSnap: FirebaseFirestore.QueryDocumentSnapshot,
) {
  const agentSnap = await agentRef.get();
  const agent = agentSnap.data() as AgentDoc | undefined;
  if (!agent) return;

  const suite = suiteDocSnap.data() as GradingSuiteDoc;

  // Create a run document
  const runRef = await suiteDocSnap.ref.collection("runs").add({
    agentVersion: agent.version ?? 1,
    status: "pending",
    score: null,
    totalCases: 0,
    passedCases: 0,
    startedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    source: "scheduled",
  } as unknown as GradingRunDoc);

  // Call the grading run API internally
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/agents/${agentId}/grading/${suiteId}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      runId: runRef.id,
      scheduled: true,
    }),
  });

  if (!res.ok) {
    await runRef.update({ status: "failed" });
    throw new Error(`Grading run failed: HTTP ${res.status}`);
  }

  // Check for alerts after run completes
  const completedRun = await runRef.get();
  const runData = completedRun.data() as GradingRunDoc | undefined;

  if (runData && suite.alertConfig?.enabled) {
    await evaluateAlerts(userId, agentId, suiteId, suite, runData);
  }
}

// ---------------------------------------------------------------------------
// Alert evaluation
// ---------------------------------------------------------------------------

async function evaluateAlerts(
  userId: string,
  agentId: string,
  suiteId: string,
  suite: GradingSuiteDoc,
  run: GradingRunDoc,
) {
  const alerts = suite.alertConfig;
  if (!alerts?.enabled) return;

  const score = run.score ?? 0;
  const reasons: string[] = [];

  // Check score threshold
  if (alerts.scoreThreshold !== undefined && score < alerts.scoreThreshold) {
    reasons.push(
      `Score ${(score * 100).toFixed(0)}% is below threshold ${(alerts.scoreThreshold * 100).toFixed(0)}%`,
    );
  }

  // Check score drop vs previous run
  if (alerts.onScoreDrop) {
    const prevRunsSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`)
      .orderBy("createdAt", "desc")
      .limit(2)
      .get();

    if (prevRunsSnap.docs.length >= 2) {
      const prevScore = (prevRunsSnap.docs[1].data() as GradingRunDoc).score ?? 0;
      if (score < prevScore) {
        reasons.push(
          `Score dropped from ${(prevScore * 100).toFixed(0)}% to ${(score * 100).toFixed(0)}%`,
        );
      }
    }
  }

  if (reasons.length === 0) return;

  const message = `Grading Alert for suite "${suite.name}"\n\n${reasons.join("\n")}\n\nPassed: ${run.passedCases}/${run.totalCases} cases`;

  // Dispatch to configured channels
  const { channels } = alerts;

  if (channels.slackWebhook) {
    fetch(channels.slackWebhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    }).catch(() => {});
  }

  if (channels.webhookUrl) {
    fetch(channels.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "grading_alert",
        agentId,
        suiteId,
        score,
        reasons,
        passedCases: run.passedCases,
        totalCases: run.totalCases,
      }),
    }).catch(() => {});
  }

  // Email via Resend (fire-and-forget)
  if (channels.email) {
    const { sendGradingAlert } = await import("@/lib/email/resend");
    sendGradingAlert(channels.email, suite.name, message).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Simple cron expression → next run calculator
// Supports: "M H D MON DOW" (standard 5-field cron)
// ---------------------------------------------------------------------------

function computeNextRun(cron: string, from: Date): Date {
  // Parse fields
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) {
    // Fallback: 24 hours from now
    return new Date(from.getTime() + 24 * 60 * 60 * 1000);
  }

  const [minField, hourField] = parts;
  const minute = minField === "*" ? 0 : parseInt(minField, 10);
  const hour = hourField === "*" ? from.getHours() : parseInt(hourField, 10);

  // Compute next occurrence
  const next = new Date(from);
  next.setMinutes(minute);
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (hourField === "*") {
    // Every hour at :minute
    next.setHours(from.getHours());
    if (next <= from) next.setHours(next.getHours() + 1);
  } else {
    next.setHours(hour);
    if (next <= from) next.setDate(next.getDate() + 1);
  }

  return next;
}
