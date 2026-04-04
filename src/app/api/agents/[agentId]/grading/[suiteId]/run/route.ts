import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { reportUsageToStripe } from "@/lib/stripe/server";
import { logAppError } from "@/lib/errors/logger";
import { buildCriterionConfig } from "@/lib/grading/build-criterion-config";
import { generateImprovementNotes } from "@/lib/grading/improvement-notes";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { createSessionServer, appendSessionEvents, endSessionServer } from "@/lib/billing/track-usage-server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; suiteId: string }> }
) {
  const { agentId, suiteId } = await params;
  const { cases, userId, locale } = await request.json();
  const uiLocale: string = locale || "en";

  // Enforce plan grading limits
  if (userId) {
    const planCheck = await checkPlanLimits(userId, "grading");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
    const tokenCheck = await checkPlanLimits(userId, "tokens");
    if (!tokenCheck.allowed) {
      return NextResponse.json(
        { error: tokenCheck.reason, plan: tokenCheck.plan },
        { status: 403 }
      );
    }
  }

  const { stream, send, close } = createSSEStream();

  (async () => {
    let runId = "";

    try {
      // Fetch agent config from Firestore
      let systemPrompt = "You are a helpful AI agent.";
      let modelProvider = "anthropic";
      let modelId = "claude-sonnet-4-6";
      let connectedRepos: string[] = [];
      let agentVersion = 1;

      if (userId) {
        const agentSnap = await adminDb
          .doc(`users/${userId}/agents/${agentId}`)
          .get();
        if (agentSnap.exists) {
          const agentData = agentSnap.data()!;
          systemPrompt = agentData.systemPrompt || systemPrompt;
          modelProvider = agentData.modelProvider || modelProvider;
          modelId = agentData.modelId || modelId;
          connectedRepos = agentData.connectedRepos || [];
          agentVersion = agentData.version || 1;
        }

        // Fetch skills and inject into system prompt
        const skillsSnap = await adminDb
          .collection(`users/${userId}/agents/${agentId}/skills`)
          .get();
        if (!skillsSnap.empty) {
          const skillsXml = skillsSnap.docs
            .map((d) => {
              const s = d.data();
              return `<skill name="${s.name}">\n${s.content}\n</skill>`;
            })
            .join("\n\n");
          systemPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
        }

        // Inject repo context if connected (plan check)
        if (connectedRepos.length > 0) {
          const ghCheck = await checkPlanLimits(userId, "github");
          if (!ghCheck.allowed) {
            connectedRepos = []; // Silently skip — don't fail grading
          }
          const fetchCtx = (await import("./fetch-repo-context")).default;
          const repoCtx = connectedRepos.length > 0 ? await fetchCtx(userId, connectedRepos) : null;
          if (repoCtx) {
            systemPrompt += `\n\n${repoCtx}`;
          }
        }

        // Create grading run record in Firestore
        const runRef = await adminDb
          .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`)
          .add({
            agentVersion,
            status: "running",
            score: null,
            totalCases: cases.length,
            passedCases: 0,
            startedAt: FieldValue.serverTimestamp(),
            completedAt: null,
            createdAt: FieldValue.serverTimestamp(),
          });
        runId = runRef.id;
      }

      // Resolve API key(s) from user Firestore settings
      const apiKeys = userId ? await resolveProviderKeys(userId, modelProvider) : [];
      const apiKey = apiKeys[0];

      send("status", { status: "running", totalCases: cases.length, runId });

      let totalMetrics: AgentRunMetrics = { inputTokens: 0, outputTokens: 0, toolCallCount: 0, toolIterations: 0 };
      let totalScore = 0;
      let passedCases = 0;
      const pendingToolArgs: Record<string, Record<string, unknown>> = {};
      const caseResultsForAnalysis: { caseName: string; passed: boolean; score: number; expectedBehavior: string; agentOutput: string; criteriaResults: { criterionType: string; passed: boolean; score: number; message: string }[] }[] = [];

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        const caseStartTime = Date.now();

        send("case_start", {
          caseIndex: i,
          caseName: testCase.name,
          totalCases: cases.length,
        });

        const collector = createEventCollector();
        let caseMetrics: AgentRunMetrics | null = null;

        // Create session for this grading case
        let caseSessionId = "";
        if (userId) {
          try {
            caseSessionId = await createSessionServer(userId, agentId, {
              purpose: `[Grading] ${testCase.name}`,
              modelUsed: modelId,
              providerUsed: modelProvider,
            });
          } catch { /* continue without session */ }
        }

        await runAgentWithTools(
          {
            provider: modelProvider,
            model: modelId,
            systemPrompt,
            messages: [{ role: "user", content: testCase.inputPrompt }],
            userId,
            agentId,
            connectedRepos,
            apiKey,
            apiKeys: apiKeys.length > 1 ? apiKeys : undefined,
            skipOutboundWebhooks: true,
          },
          {
            onToken: (text) => {
              collector.addToken(text);
            },
            onToolStart: (tc) => {
              pendingToolArgs[tc.name] = tc.args;
            },
            onToolEnd: (result) => {
              collector.addToolCall({
                name: result.name,
                args: pendingToolArgs[result.name] || {},
                result: result.result,
                isError: result.isError,
              });
              delete pendingToolArgs[result.name];
            },
            onDone: (metrics) => {
              caseMetrics = metrics;
              totalMetrics = {
                inputTokens: totalMetrics.inputTokens + metrics.inputTokens,
                outputTokens: totalMetrics.outputTokens + metrics.outputTokens,
                toolCallCount: totalMetrics.toolCallCount + metrics.toolCallCount,
                toolIterations: totalMetrics.toolIterations + metrics.toolIterations,
              };
            },
            onError: (error) => {
              console.error("[GRADING] Agent error on case", i, ":", error.message);
              collector.addToken(`\nError: ${error.message}`);
            },
          }
        );

        // Log grading session events
        if (caseSessionId && userId) {
          try {
            collector.finalize();
            await appendSessionEvents(userId, agentId, caseSessionId, [
              { type: "user_message", data: { content: testCase.inputPrompt } },
              { type: "assistant_message", data: { content: collector.assistantOutput } },
            ]);
            await endSessionServer(userId, agentId, caseSessionId);
          } catch { /* best-effort logging */ }
        }

        collector.finalize();

        // Run criteria evaluation — backfill empty configs from expectedBehavior
        const { evaluateAllCriteria } = await import("@/lib/grading/criteria");
        const enrichedCriteria = (testCase.criteria || []).map((cr: { id: string; type: string; name: string; config: Record<string, unknown>; weight: number }) => {
          const hasConfig = cr.config && Object.keys(cr.config).length > 0;
          if (hasConfig) return cr;
          return { ...cr, config: buildCriterionConfig(cr.type, testCase.expectedBehavior || "") };
        });
        const {
          results: criteriaResults,
          score,
          passed,
        } = await evaluateAllCriteria(enrichedCriteria, collector, uiLocale, apiKey, userId, agentId);

        totalScore += score;
        if (passed) passedCases++;

        // Track for improvement analysis
        caseResultsForAnalysis.push({
          caseName: testCase.name,
          passed,
          score,
          expectedBehavior: testCase.expectedBehavior || "",
          agentOutput: collector.assistantOutput.slice(0, 1000),
          criteriaResults: criteriaResults.map((cr: { criterionType: string; passed: boolean; score: number; message: string }) => ({
            criterionType: cr.criterionType,
            passed: cr.passed,
            score: cr.score,
            message: cr.message,
          })),
        });

        const durationMs = Date.now() - caseStartTime;

        // Persist result to Firestore
        if (userId && runId) {
          adminDb
            .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}/results`)
            .add({
              caseId: testCase.id || `case-${i}`,
              passed,
              score,
              agentOutput: collector.assistantOutput.slice(0, 50000),
              toolCalls: collector.toolCalls,
              criteriaResults,
              durationMs,
              createdAt: FieldValue.serverTimestamp(),
            })
            .catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));
        }

        send("case_end", {
          caseIndex: i,
          caseName: testCase.name,
          passed,
          score,
          criteriaResults,
          agentOutput: collector.assistantOutput,
          toolCalls: collector.toolCalls,
          metrics: caseMetrics,
        });
      }

      const finalScore = cases.length > 0 ? totalScore / cases.length : 0;

      // Update grading run with final results + update agent's latestGradingScore
      if (userId && runId) {
        adminDb
          .doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`)
          .update({
            status: "completed",
            score: finalScore,
            passedCases,
            completedAt: FieldValue.serverTimestamp(),
          })
          .catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));

        // Update agent's latestGradingScore
        adminDb
          .doc(`users/${userId}/agents/${agentId}`)
          .update({ latestGradingScore: finalScore })
          .catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));
      }

      // Track grading run count in usage doc (fire-and-forget)
      if (userId) {
        const yearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        adminDb.doc(`users/${userId}/usage/${yearMonth}`).set(
          { gradingRuns: FieldValue.increment(1) },
          { merge: true }
        ).catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));

        reportUsageToStripe(userId, 0, 0, 1).catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));
      }

      send("done", { suiteId, agentId, runId, metrics: totalMetrics, score: finalScore, passedCases });

      // Generate improvement notes (async, after done — SSE still open)
      if (finalScore < 0.99 && caseResultsForAnalysis.length > 0) {
        try {
          send("improvement_status", { status: "analyzing" });
          // Resolve anthropic key for improvement analysis (always uses anthropic)
          const improvementApiKey = userId && modelProvider !== "anthropic"
            ? await resolveProviderKey(userId, "anthropic")
            : apiKey;
          const analysis = await generateImprovementNotes(
            systemPrompt,
            finalScore,
            caseResultsForAnalysis,
            uiLocale,
            improvementApiKey,
            userId,
            agentId,
          );
          send("improvement_notes", {
            summary: analysis.summary,
            notes: analysis.notes,
          });

          // Persist to Firestore
          if (userId && runId) {
            adminDb
              .doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`)
              .update({
                improvementSummary: analysis.summary,
                improvementNotes: analysis.notes,
              })
              .catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));
          }
        } catch (err) {
          console.error("[GRADING] Improvement notes failed:", (err as Error).message);
        }
      }
    } catch (err) {
      // Mark run as failed if it was created
      if (userId && runId) {
        adminDb
          .doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}`)
          .update({ status: "failed", completedAt: FieldValue.serverTimestamp() })
          .catch((err) => logAppError({ code: "GRADING_WRITE_FAILED", message: (err as Error).message, source: "grading", userId, agentId }));
      }
      console.error("[GRADING] Run failed:", (err as Error).message, (err as Error).stack);
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
