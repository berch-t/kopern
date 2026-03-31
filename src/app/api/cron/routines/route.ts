import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import type { RoutineDoc, AgentDoc } from "@/lib/firebase/firestore";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results: { teamId: string; routineId: string; status: string }[] = [];

  try {
    const usersSnap = await adminDb.collection("users").listDocuments();

    for (const userRef of usersSnap) {
      const teamsSnap = await userRef.collection("agentTeams").listDocuments();

      for (const teamRef of teamsSnap) {
        const routinesSnap = await teamRef
          .collection("routines")
          .where("enabled", "==", true)
          .get();

        for (const routineSnap of routinesSnap.docs) {
          const routine = routineSnap.data() as RoutineDoc;
          if (!routine.cron) continue;

          // Check if cron matches current time window (5-min granularity)
          if (!cronMatchesNow(routine.cron, now)) continue;

          // Skip if recently run (prevent double-execution within same window)
          const lastRun = routine.lastRunAt?.toDate?.();
          if (lastRun && now.getTime() - lastRun.getTime() < 4 * 60 * 1000) continue;

          // Concurrency check
          if (routine.concurrencyPolicy === "skip_if_active" && routine.lastRunStatus === undefined) {
            // Could be still running — skip (simplified check)
          }

          // Mark as running
          await routineSnap.ref.update({
            lastRunAt: FieldValue.serverTimestamp(),
          });

          try {
            const output = await executeRoutine(
              userRef.id,
              routine.agentId,
              routine.prompt,
            );
            await routineSnap.ref.update({
              lastRunStatus: "success",
              lastRunOutput: output.slice(0, 2000),
            });
            results.push({
              teamId: teamRef.id,
              routineId: routineSnap.id,
              status: "success",
            });
          } catch (err) {
            await routineSnap.ref.update({
              lastRunStatus: "error",
              lastRunOutput: String(err).slice(0, 500),
            });
            results.push({
              teamId: teamRef.id,
              routineId: routineSnap.id,
              status: `error: ${String(err).slice(0, 100)}`,
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      routinesExecuted: results.length,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

async function executeRoutine(
  userId: string,
  agentId: string,
  prompt: string,
): Promise<string> {
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  const agent = agentSnap.data() as AgentDoc | undefined;
  if (!agent) throw new Error("Agent not found");

  const provider = (agent.modelProvider as string) || "anthropic";
  const model = (agent.modelId as string) || "claude-sonnet-4-6";
  const apiKeys = await resolveProviderKeys(userId, provider);

  let output = "";

  await runAgentWithTools(
    {
      provider,
      model,
      systemPrompt: (agent.systemPrompt as string) || "",
      messages: [{ role: "user", content: prompt }],
      userId,
      agentId,
      connectedRepos: [],
      apiKey: apiKeys[0],
      apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
      skipOutboundWebhooks: true,
      toolApprovalPolicy: "auto", // routines run unattended
    },
    {
      onToken: (text) => { output += text; },
      onDone: () => {},
      onError: (err) => { throw err; },
    },
  );

  return output;
}

/**
 * Simple cron matcher for 5-min Vercel Cron tick.
 * Checks if the current minute/hour match the cron expression.
 */
function cronMatchesNow(cron: string, now: Date): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return false;

  const [minField, hourField, , , dowField] = parts;
  const currentMin = now.getMinutes();
  const currentHour = now.getHours();
  const currentDow = now.getDay(); // 0=Sun

  if (!fieldMatches(minField, currentMin)) return false;
  if (!fieldMatches(hourField, currentHour)) return false;
  if (dowField !== "*" && !fieldMatches(dowField, currentDow)) return false;

  return true;
}

function fieldMatches(field: string, value: number): boolean {
  if (field === "*") return true;

  // Handle step: */5
  if (field.startsWith("*/")) {
    const step = parseInt(field.slice(2), 10);
    return value % step === 0;
  }

  // Handle range: 1-5
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  // Handle list: 0,15,30,45
  if (field.includes(",")) {
    return field.split(",").map(Number).includes(value);
  }

  return parseInt(field, 10) === value;
}
