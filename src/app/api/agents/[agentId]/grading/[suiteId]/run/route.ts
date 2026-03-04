import { NextRequest } from "next/server";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { createEventCollector, type CollectedEvents } from "@/lib/pi-mono/event-collector";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string; suiteId: string }> }
) {
  const { agentId, suiteId } = await params;
  const { cases } = await request.json();

  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", { status: "running", totalCases: cases.length });

      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];

        send("case_start", {
          caseIndex: i,
          caseName: testCase.name,
          totalCases: cases.length,
        });

        // MVP: Simulate agent execution for each case
        // In production, this creates a fresh AgentSession per case
        const collector = createEventCollector();

        // Simulate processing
        await new Promise((r) => setTimeout(r, 500));

        // Simulate some output
        const tokens = `Response to: ${testCase.inputPrompt}`.split("");
        for (const token of tokens) {
          collector.addToken(token);
        }

        // Simulate a tool call
        collector.addToolCall({
          name: "read",
          args: { path: "test.txt" },
          result: "test content",
          isError: false,
        });

        collector.finalize();

        // Run criteria evaluation
        const { evaluateAllCriteria } = await import("@/lib/grading/criteria");
        const { results: criteriaResults, score, passed } = await evaluateAllCriteria(
          testCase.criteria || [],
          collector
        );

        send("case_end", {
          caseIndex: i,
          caseName: testCase.name,
          passed,
          score,
          criteriaResults,
          agentOutput: collector.assistantOutput,
        });

        await new Promise((r) => setTimeout(r, 200));
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
