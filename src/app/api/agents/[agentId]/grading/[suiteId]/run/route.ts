import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { streamLLM, type LLMMessage } from "@/lib/llm/client";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; suiteId: string }> }
) {
  const { agentId, suiteId } = await params;
  const { cases, userId } = await request.json();

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      // Fetch agent config from Firestore
      let systemPrompt = "You are a helpful AI agent.";
      let modelProvider = "anthropic";
      let modelId = "claude-sonnet-4-6";

      if (userId) {
        const agentSnap = await adminDb
          .doc(`users/${userId}/agents/${agentId}`)
          .get();
        if (agentSnap.exists) {
          const agentData = agentSnap.data()!;
          systemPrompt = agentData.systemPrompt || systemPrompt;
          modelProvider = agentData.modelProvider || modelProvider;
          modelId = agentData.modelId || modelId;
        }

        // Fetch skills from subcollection and inject into system prompt
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
      }

      send("status", { status: "running", totalCases: cases.length });

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];

        send("case_start", {
          caseIndex: i,
          caseName: testCase.name,
          totalCases: cases.length,
        });

        const collector = createEventCollector();

        // Execute real LLM call for this test case
        const messages: LLMMessage[] = [
          { role: "user", content: testCase.inputPrompt },
        ];

        await new Promise<void>((resolve, reject) => {
          streamLLM(
            {
              provider: modelProvider,
              model: modelId,
              systemPrompt,
              messages,
            },
            {
              onToken: (text) => {
                collector.addToken(text);
              },
              onDone: () => {
                resolve();
              },
              onError: (error) => {
                reject(error);
              },
            }
          );
        });

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
        });
      }

      send("done", { suiteId, agentId });
    } catch (err) {
      send("error", { message: (err as Error).message });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}
