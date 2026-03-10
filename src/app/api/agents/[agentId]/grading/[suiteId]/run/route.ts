import { NextRequest, NextResponse } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { runAgentWithTools, type AgentRunMetrics } from "@/lib/tools/run-agent";
import { checkPlanLimits } from "@/lib/stripe/plan-guard";
import { reportUsageToStripe } from "@/lib/stripe/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; suiteId: string }> }
) {
  const { agentId, suiteId } = await params;
  const { cases, userId } = await request.json();

  // Enforce plan grading limits
  if (userId) {
    const planCheck = await checkPlanLimits(userId, "grading");
    if (!planCheck.allowed) {
      return NextResponse.json(
        { error: planCheck.reason, plan: planCheck.plan },
        { status: 403 }
      );
    }
    // Also check token limits
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
    try {
      // Fetch agent config from Firestore
      let systemPrompt = "You are a helpful AI agent.";
      let modelProvider = "anthropic";
      let modelId = "claude-sonnet-4-6";
      let connectedRepos: string[] = [];

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

        // Inject repo context if connected
        if (connectedRepos.length > 0) {
          const fetchCtx = (await import("./fetch-repo-context")).default;
          const repoCtx = await fetchCtx(userId, connectedRepos);
          if (repoCtx) {
            systemPrompt += `\n\n${repoCtx}`;
          }
        }
      }

      send("status", { status: "running", totalCases: cases.length });

      let totalMetrics: AgentRunMetrics = { inputTokens: 0, outputTokens: 0, toolCallCount: 0, toolIterations: 0 };

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];

        send("case_start", {
          caseIndex: i,
          caseName: testCase.name,
          totalCases: cases.length,
        });

        const collector = createEventCollector();
        let caseMetrics: AgentRunMetrics | null = null;

        await runAgentWithTools(
          {
            provider: modelProvider,
            model: modelId,
            systemPrompt,
            messages: [{ role: "user", content: testCase.inputPrompt }],
            userId,
            agentId,
            connectedRepos,
          },
          {
            onToken: (text) => {
              collector.addToken(text);
            },
            onToolStart: (tc) => {
              // Tool calls tracked in collector
            },
            onToolEnd: (result) => {
              collector.addToolCall({
                name: result.name,
                args: {},
                result: result.result,
                isError: result.isError,
              });
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
              collector.addToken(`\nError: ${error.message}`);
            },
          }
        );

        collector.finalize();

        // Run criteria evaluation
        const { evaluateAllCriteria } = await import("@/lib/grading/criteria");
        const {
          results: criteriaResults,
          score,
          passed,
        } = await evaluateAllCriteria(testCase.criteria || [], collector);

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

      // Track grading run count in usage doc (fire-and-forget)
      if (userId) {
        const yearMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
        adminDb.doc(`users/${userId}/usage/${yearMonth}`).set(
          { gradingRuns: FieldValue.increment(1) },
          { merge: true }
        ).catch(() => {});

        // Report to Stripe meter for usage-based plans
        reportUsageToStripe(userId, 0, 0, 1).catch(() => {});
      }

      send("done", { suiteId, agentId, metrics: totalMetrics });
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
