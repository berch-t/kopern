import { type GradingCaseDoc } from "@/lib/firebase/firestore";
import { createEventCollector, type CollectedEvents } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "./criteria";
import { type CriterionResult, type GradingProgress } from "./types";

export interface CaseResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  score: number;
  agentOutput: string;
  toolCalls: CollectedEvents["toolCalls"];
  criteriaResults: CriterionResult[];
  durationMs: number;
}

export interface GradingRunResult {
  score: number;
  totalCases: number;
  passedCases: number;
  results: CaseResult[];
}

export async function runGradingSuite(
  cases: (GradingCaseDoc & { id: string })[],
  executeCase: (inputPrompt: string) => Promise<CollectedEvents>,
  onProgress?: (progress: GradingProgress) => void
): Promise<GradingRunResult> {
  const results: CaseResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const testCase = cases[i];

    onProgress?.({
      caseIndex: i,
      totalCases: cases.length,
      caseName: testCase.name,
      status: "running",
    });

    const startTime = Date.now();

    try {
      // Execute agent with the case input
      const events = await executeCase(testCase.inputPrompt);

      // Evaluate all criteria
      const { results: criteriaResults, score, passed } = await evaluateAllCriteria(
        testCase.criteria,
        events
      );

      const durationMs = Date.now() - startTime;

      const caseResult: CaseResult = {
        caseId: testCase.id,
        caseName: testCase.name,
        passed,
        score,
        agentOutput: events.assistantOutput,
        toolCalls: events.toolCalls,
        criteriaResults,
        durationMs,
      };

      results.push(caseResult);

      onProgress?.({
        caseIndex: i,
        totalCases: cases.length,
        caseName: testCase.name,
        status: passed ? "passed" : "failed",
        score,
      });
    } catch (err) {
      const durationMs = Date.now() - startTime;

      results.push({
        caseId: testCase.id,
        caseName: testCase.name,
        passed: false,
        score: 0,
        agentOutput: `Error: ${(err as Error).message}`,
        toolCalls: [],
        criteriaResults: [],
        durationMs,
      });

      onProgress?.({
        caseIndex: i,
        totalCases: cases.length,
        caseName: testCase.name,
        status: "failed",
        score: 0,
      });
    }
  }

  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const score = totalCases > 0 ? results.reduce((sum, r) => sum + r.score, 0) / totalCases : 0;

  return { score, totalCases, passedCases, results };
}
