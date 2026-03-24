// AutoFix — Phase 1 MVP
// Analyzes grading failures, proposes prompt patches, re-validates

import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { analyzeFailures, type GradingFailure } from "./analyzer";
import { createRun, logIteration, completeRun, trackAutoresearchUsage, failRun } from "./history";
import { resolveProviderKey } from "@/lib/llm/resolve-key";
import type { AutoFixResult, AutoResearchRun, AutoResearchIteration } from "./types";

export interface AutoFixConfig {
  userId: string;
  agentId: string;
  suiteId: string;
  runId: string; // The grading run that triggered this AutoFix
}

export interface AutoFixCallbacks {
  onStatus: (status: string) => void;
  onDiagnostic: (diagnostic: AutoFixResult["diagnostics"][0]) => void;
  onResult: (result: AutoFixResult) => void;
  onError: (error: Error) => void;
}

export async function runAutoFix(
  config: AutoFixConfig,
  callbacks: AutoFixCallbacks
): Promise<AutoFixResult | null> {
  const { userId, agentId, suiteId, runId } = config;
  let arRunId: string | null = null;

  try {
    callbacks.onStatus("loading");

    // 1. Load agent config
    const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
    if (!agentSnap.exists) throw new Error("Agent not found");
    const agentData = agentSnap.data()!;
    const originalPrompt = agentData.systemPrompt || "";
    const provider = agentData.modelProvider || "anthropic";
    const model = agentData.modelId || "claude-sonnet-4-6";

    // Resolve API key from user Firestore settings
    const apiKey = await resolveProviderKey(userId, provider);

    // 2. Load grading run results (failed cases)
    const resultsSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs/${runId}/results`)
      .get();

    const failures: GradingFailure[] = [];
    let originalScore = 0;
    let totalCases = 0;

    for (const doc of resultsSnap.docs) {
      const data = doc.data();
      totalCases++;
      originalScore += data.score || 0;

      if (!data.passed) {
        // Load the case to get inputPrompt
        const caseSnap = await adminDb
          .doc(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases/${data.caseId}`)
          .get();
        const caseData = caseSnap.data();

        failures.push({
          caseId: data.caseId,
          caseName: caseData?.name || data.caseId,
          inputPrompt: caseData?.inputPrompt || "",
          agentOutput: data.agentOutput || "",
          criteriaResults: data.criteriaResults || [],
        });
      }
    }

    originalScore = totalCases > 0 ? originalScore / totalCases : 0;

    if (failures.length === 0) {
      const result: AutoFixResult = {
        diagnostics: [],
        originalPrompt,
        patchedPrompt: originalPrompt,
        promptDiff: "",
        originalScore,
        newScore: originalScore,
        tokensUsed: { input: 0, output: 0 },
      };
      callbacks.onResult(result);
      return result;
    }

    callbacks.onStatus("analyzing");

    // 3. Create autoresearch run record
    arRunId = await createRun({
      agentId,
      userId,
      suiteId,
      mode: "autofix",
      maxIterations: 2, // baseline + fix
      mutationDimensions: ["system_prompt"],
      strategy: "llm_guided",
    });

    // 4. Analyze failures and propose patches
    const { diagnostics, patchedPrompt, tokensUsed: analyzeTokens } = await analyzeFailures(
      failures,
      originalPrompt,
      provider,
      model,
      [],
      apiKey
    );

    // Send diagnostics to UI
    for (const diag of diagnostics) {
      callbacks.onDiagnostic(diag);
    }

    // Log baseline iteration
    const baselineIteration: AutoResearchIteration = {
      index: 0,
      timestamp: Date.now(),
      configSnapshot: { systemPrompt: originalPrompt },
      gradingScore: originalScore,
      criteriaBreakdown: {},
      delta: 0,
      status: "baseline",
      description: "Original agent configuration",
      tokensUsed: analyzeTokens,
      durationMs: 0,
    };
    await logIteration(userId, agentId, arRunId, baselineIteration);

    // 5. Re-run grading with patched prompt to verify
    callbacks.onStatus("validating");

    // Load ALL cases (not just failures) for re-grading
    const casesSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`)
      .orderBy("orderIndex")
      .get();

    // Load skills for system prompt
    let fullPrompt = patchedPrompt;
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
      fullPrompt += `\n\n<skills>\n${skillsXml}\n</skills>`;
    }

    let newTotalScore = 0;
    let newPassed = 0;
    const criteriaBreakdown: Record<string, number> = {};
    let rerunInputTokens = 0;
    let rerunOutputTokens = 0;
    const startTime = Date.now();

    for (const caseDoc of casesSnap.docs) {
      const testCase = caseDoc.data();
      const collector = createEventCollector();

      await runAgentWithTools(
        {
          provider,
          model,
          systemPrompt: fullPrompt,
          messages: [{ role: "user", content: testCase.inputPrompt }],
          userId,
          agentId,
          apiKey,
          skipOutboundWebhooks: true,
        },
        {
          onToken: (text) => collector.addToken(text),
          onToolStart: () => {},
          onToolEnd: (result) => {
            collector.addToolCall({
              name: result.name,
              args: {},
              result: result.result,
              isError: result.isError,
            });
          },
          onDone: (metrics) => {
            rerunInputTokens += metrics.inputTokens;
            rerunOutputTokens += metrics.outputTokens;
          },
          onError: (err) => collector.addToken(`\nError: ${err.message}`),
        }
      );

      collector.finalize();

      const { results: criteriaResults, score, passed } = await evaluateAllCriteria(
        testCase.criteria || [],
        collector,
        undefined,
        apiKey
      );

      newTotalScore += score;
      if (passed) newPassed++;

      for (const cr of criteriaResults) {
        criteriaBreakdown[cr.criterionType] = (criteriaBreakdown[cr.criterionType] || 0) + cr.score;
      }
    }

    const newScore = casesSnap.size > 0 ? newTotalScore / casesSnap.size : 0;
    const durationMs = Date.now() - startTime;

    // Log fix iteration
    const fixIteration: AutoResearchIteration = {
      index: 1,
      timestamp: Date.now(),
      configSnapshot: { systemPrompt: patchedPrompt },
      gradingScore: newScore,
      criteriaBreakdown,
      delta: newScore - originalScore,
      status: newScore >= originalScore ? "keep" : "discard",
      description: `AutoFix: ${diagnostics.length} issues diagnosed, prompt patched`,
      tokensUsed: { input: analyzeTokens.input + rerunInputTokens, output: analyzeTokens.output + rerunOutputTokens },
      durationMs,
    };
    await logIteration(userId, agentId, arRunId, fixIteration);

    // Generate simple diff representation
    const promptDiff = generateSimpleDiff(originalPrompt, patchedPrompt);

    // Complete the run
    const totalTokens = {
      input: analyzeTokens.input + rerunInputTokens,
      output: analyzeTokens.output + rerunOutputTokens,
    };

    const run: AutoResearchRun = {
      id: arRunId,
      agentId,
      suiteId,
      mode: "autofix",
      status: "completed",
      config: { agentId, userId, suiteId, mode: "autofix", maxIterations: 2, mutationDimensions: ["system_prompt"], strategy: "llm_guided" },
      iterations: [baselineIteration, fixIteration],
      baselineScore: originalScore,
      bestScore: Math.max(originalScore, newScore),
      bestIterationIndex: newScore >= originalScore ? 1 : 0,
      totalTokensUsed: totalTokens,
      totalCost: 0,
      startedAt: baselineIteration.timestamp,
      completedAt: Date.now(),
    };
    const result: AutoFixResult = {
      diagnostics,
      originalPrompt,
      patchedPrompt,
      promptDiff,
      originalScore,
      newScore,
      tokensUsed: totalTokens,
    };

    await completeRun(userId, agentId, arRunId, run, {
      autofixResult: {
        diagnostics: result.diagnostics,
        originalPrompt: result.originalPrompt,
        patchedPrompt: result.patchedPrompt,
        promptDiff: result.promptDiff,
        originalScore: result.originalScore,
        newScore: result.newScore,
      },
    });

    // Track usage
    await trackAutoresearchUsage(userId, agentId, provider, totalTokens.input, totalTokens.output, 2);

    callbacks.onResult(result);
    return result;
  } catch (err) {
    if (arRunId) {
      await failRun(userId, agentId, arRunId, (err as Error).message).catch(() => {});
    }
    callbacks.onError(err as Error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Simple diff generator
// ---------------------------------------------------------------------------

function generateSimpleDiff(original: string, patched: string): string {
  const origLines = original.split("\n");
  const patchLines = patched.split("\n");
  const diff: string[] = [];

  const maxLines = Math.max(origLines.length, patchLines.length);
  for (let i = 0; i < maxLines; i++) {
    const origLine = origLines[i] ?? "";
    const patchLine = patchLines[i] ?? "";

    if (origLine !== patchLine) {
      if (origLine) diff.push(`- ${origLine}`);
      if (patchLine) diff.push(`+ ${patchLine}`);
    }
  }

  return diff.join("\n");
}
