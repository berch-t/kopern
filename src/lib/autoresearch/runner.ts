// AutoTune Runner — Phase 2
// Hill-climbing optimization loop with keep/discard decisions

import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";
import { applyMutation } from "./strategies";
import { getAvailableModelsForUser, checkOllamaReachable } from "./available-models";
import { resolveProviderKey, resolveProviderKeys } from "@/lib/llm/resolve-key";
import { createSessionServer, updateSessionMetrics, endSessionServer } from "@/lib/billing/track-usage-server";
import type { GradingRunSource, ImprovementNote } from "@/lib/firebase/firestore";
import {
  createRun,
  logIteration,
  completeRun,
  trackAutoresearchUsage,
  failRun,
} from "./history";
import type {
  AutoResearchConfig,
  AutoResearchIteration,
  AutoResearchRun,
  AutoResearchCallbacks,
} from "./types";

// ---------------------------------------------------------------------------
// Stop condition checks
// ---------------------------------------------------------------------------

interface StopCheck {
  shouldStop: boolean;
  reason?: string;
}

function checkStopConditions(
  config: AutoResearchConfig,
  bestScore: number,
  iterationsRun: number,
  totalTokens: { input: number; output: number },
  consecutiveDiscards: number
): StopCheck {
  if (config.targetScore && bestScore >= config.targetScore) {
    return { shouldStop: true, reason: `Target score reached: ${bestScore.toFixed(2)} >= ${config.targetScore}` };
  }
  if (iterationsRun >= config.maxIterations) {
    return { shouldStop: true, reason: `Max iterations reached: ${iterationsRun}` };
  }
  if (config.maxTokenBudget) {
    const totalUsed = totalTokens.input + totalTokens.output;
    if (totalUsed >= config.maxTokenBudget) {
      return { shouldStop: true, reason: `Token budget exhausted: ${totalUsed} >= ${config.maxTokenBudget}` };
    }
  }
  if (consecutiveDiscards >= 5) {
    return { shouldStop: true, reason: `Plateau detected: ${consecutiveDiscards} consecutive discards` };
  }
  return { shouldStop: false };
}

// ---------------------------------------------------------------------------
// Main AutoTune runner
// ---------------------------------------------------------------------------

export async function runAutoTune(
  config: AutoResearchConfig,
  callbacks: AutoResearchCallbacks
): Promise<AutoResearchRun> {
  const { userId, agentId, suiteId } = config;

  // Pre-check Ollama + load available models
  await checkOllamaReachable();
  const availableModels = await getAvailableModelsForUser(userId);

  // Load agent config
  const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
  if (!agentSnap.exists) throw new Error("Agent not found");
  const agentData = agentSnap.data()!;

  const provider = agentData.modelProvider || "anthropic";
  const model = agentData.modelId || "claude-sonnet-4-6";

  // Resolve API key(s) from user Firestore settings
  const apiKeys = await resolveProviderKeys(userId, provider);
  const apiKey = apiKeys[0];

  // Load cases
  const casesSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`)
    .orderBy("orderIndex")
    .get();

  if (casesSnap.empty) throw new Error("No grading cases found");

  // Load skills
  let baseSkillsXml = "";
  const skillsSnap = await adminDb
    .collection(`users/${userId}/agents/${agentId}/skills`)
    .get();
  if (!skillsSnap.empty) {
    baseSkillsXml = `\n\n<skills>\n${skillsSnap.docs
      .map((d) => {
        const s = d.data();
        return `<skill name="${s.name}">\n${s.content}\n</skill>`;
      })
      .join("\n\n")}\n</skills>`;
  }

  // Fetch improvement notes from latest completed grading run (if any)
  let improvementNotes: ImprovementNote[] = [];
  try {
    // Prefer pending optimization request on agent doc (sent from grading UI)
    if (agentData.pendingOptimizationRequest?.notes?.length) {
      improvementNotes = agentData.pendingOptimizationRequest.notes;
    } else {
      const latestRunSnap = await adminDb
        .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/runs`)
        .where("status", "==", "completed")
        .orderBy("completedAt", "desc")
        .limit(1)
        .get();
      if (!latestRunSnap.empty) {
        improvementNotes = latestRunSnap.docs[0].data().improvementNotes || [];
      }
    }
  } catch { /* continue without notes */ }

  // Create run
  const runId = await createRun(config);

  const run: AutoResearchRun = {
    id: runId,
    agentId,
    suiteId,
    mode: config.mode,
    status: "running",
    config,
    iterations: [],
    baselineScore: 0,
    bestScore: 0,
    bestIterationIndex: 0,
    totalTokensUsed: { input: 0, output: 0 },
    totalCost: 0,
    startedAt: Date.now(),
  };

  let currentPrompt = agentData.systemPrompt || "";
  let bestPrompt = currentPrompt;
  let bestScore = 0;
  let consecutiveDiscards = 0;

  try {
    // --- ITERATION 1: BASELINE ---
    callbacks.onIterationStart(1, "Running baseline evaluation");

    const agentVersion = agentData.version || 1;
    const gradingOpts = { suiteId, source: "autotune" as GradingRunSource, agentVersion };

    const baselineResult = await runGradingSuiteOnPrompt(
      currentPrompt + baseSkillsXml,
      casesSnap,
      provider,
      model,
      userId,
      agentId,
      apiKey,
      apiKeys,
      gradingOpts
    );

    const baselineIteration: AutoResearchIteration = {
      index: 1,
      timestamp: Date.now(),
      configSnapshot: { systemPrompt: currentPrompt },
      gradingScore: baselineResult.score,
      criteriaBreakdown: baselineResult.criteriaBreakdown,
      delta: 0,
      status: "baseline",
      description: "Baseline evaluation of current agent configuration",
      tokensUsed: baselineResult.tokensUsed,
      durationMs: baselineResult.durationMs,
    };

    run.baselineScore = baselineResult.score;
    run.bestScore = baselineResult.score;
    bestScore = baselineResult.score;
    run.iterations.push(baselineIteration);
    run.totalTokensUsed.input += baselineResult.tokensUsed.input;
    run.totalTokensUsed.output += baselineResult.tokensUsed.output;

    // Keep latest grading results to feed into mutation analysis (avoids re-running grading)
    let lastGradingResults = baselineResult.gradingResults;

    await logIteration(userId, agentId, runId, baselineIteration);
    callbacks.onIterationEnd(baselineIteration);

    // --- ITERATIONS 2..N+1 ---
    for (let i = 2; i <= config.maxIterations + 1; i++) {
      // Check stop conditions
      const stop = checkStopConditions(config, bestScore, i - 2, run.totalTokensUsed, consecutiveDiscards);
      if (stop.shouldStop) {
        break;
      }

      callbacks.onIterationStart(i, "analyzing and proposing mutation");
      const iterStart = Date.now();

      // Phase: ANALYZE + MUTATE (use cached grading results from previous iteration)
      const mutation = await applyMutation(
        config.strategy,
        { ...agentData, systemPrompt: currentPrompt },
        lastGradingResults,
        run.iterations,
        config.mutationDimensions,
        provider,
        model,
        availableModels,
        config.userScript,
        apiKey,
        improvementNotes
      );

      run.totalTokensUsed.input += mutation.tokensUsed.input;
      run.totalTokensUsed.output += mutation.tokensUsed.output;

      const candidatePrompt = mutation.newConfig.systemPrompt || currentPrompt;

      // Phase: EXECUTE (re-grade with candidate prompt)
      const result = await runGradingSuiteOnPrompt(
        candidatePrompt + baseSkillsXml,
        casesSnap,
        provider,
        model,
        userId,
        agentId,
        apiKey,
        apiKeys,
        gradingOpts
      );

      run.totalTokensUsed.input += result.tokensUsed.input;
      run.totalTokensUsed.output += result.tokensUsed.output;
      lastGradingResults = result.gradingResults;

      // Phase: DECIDE
      const delta = result.score - bestScore;
      const isKeep = result.score > bestScore ||
        (Math.abs(delta) < 0.01 && candidatePrompt.length < currentPrompt.length);

      const iteration: AutoResearchIteration = {
        index: i,
        timestamp: Date.now(),
        configSnapshot: { systemPrompt: candidatePrompt },
        gradingScore: result.score,
        criteriaBreakdown: result.criteriaBreakdown,
        delta,
        status: isKeep ? "keep" : "discard",
        description: mutation.description,
        tokensUsed: {
          input: mutation.tokensUsed.input + result.tokensUsed.input,
          output: mutation.tokensUsed.output + result.tokensUsed.output,
        },
        durationMs: Date.now() - iterStart,
      };

      if (isKeep) {
        currentPrompt = candidatePrompt;
        bestPrompt = candidatePrompt;
        bestScore = result.score;
        run.bestScore = bestScore;
        run.bestIterationIndex = i;
        consecutiveDiscards = 0;
      } else {
        consecutiveDiscards++;
      }

      run.iterations.push(iteration);
      await logIteration(userId, agentId, runId, iteration);
      callbacks.onIterationEnd(iteration);

      callbacks.onProgress({
        currentScore: result.score,
        bestScore,
        iterationsLeft: config.maxIterations + 1 - i,
        tokensUsed: run.totalTokensUsed,
      });
    }

    // --- COMPLETE ---
    run.status = "completed";
    run.completedAt = Date.now();
    await completeRun(userId, agentId, runId, run, {
      autotuneResult: { bestPrompt },
    });

    // Clear pending optimization request if it was consumed
    if (agentData.pendingOptimizationRequest?.notes?.length) {
      adminDb.doc(`users/${userId}/agents/${agentId}`).update({
        pendingOptimizationRequest: null,
      }).catch(() => {});
    }

    // Track usage
    await trackAutoresearchUsage(
      userId,
      agentId,
      provider,
      run.totalTokensUsed.input,
      run.totalTokensUsed.output,
      run.iterations.length
    );

    callbacks.onComplete(run);
    return run;
  } catch (err) {
    run.status = "error";
    await failRun(userId, agentId, runId, (err as Error).message);
    callbacks.onError(err as Error);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Run grading suite on a specific prompt
// ---------------------------------------------------------------------------

async function runGradingSuiteOnPrompt(
  systemPrompt: string,
  casesSnap: FirebaseFirestore.QuerySnapshot,
  provider: string,
  model: string,
  userId: string,
  agentId: string,
  apiKey?: string,
  apiKeys?: string[],
  opts?: { suiteId?: string; source?: GradingRunSource; agentVersion?: number }
): Promise<{
  score: number;
  criteriaBreakdown: Record<string, number>;
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[];
  tokensUsed: { input: number; output: number };
  durationMs: number;
}> {
  const startTime = Date.now();
  let totalScore = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let totalToolCalls = 0;
  const criteriaBreakdown: Record<string, number> = {};
  const gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[] = [];

  // (A) Create session for this optimization grading
  let sessionId = "";
  try {
    sessionId = await createSessionServer(userId, agentId, {
      purpose: `[${opts?.source || "autotune"}] Grading evaluation`,
      modelUsed: model,
      providerUsed: provider,
      source: "autoresearch",
    });
  } catch { /* continue without session */ }

  // (B) Create grading run record if suiteId provided
  let gradingRunId = "";
  if (opts?.suiteId) {
    try {
      const runRef = await adminDb
        .collection(`users/${userId}/agents/${agentId}/gradingSuites/${opts.suiteId}/runs`)
        .add({
          agentVersion: opts.agentVersion || 1,
          status: "running",
          score: null,
          totalCases: casesSnap.size,
          passedCases: 0,
          source: opts.source || "autotune",
          startedAt: FieldValue.serverTimestamp(),
          completedAt: null,
          createdAt: FieldValue.serverTimestamp(),
        });
      gradingRunId = runRef.id;
    } catch { /* continue without persisting */ }
  }

  let passedCases = 0;
  const resultWritePromises: Promise<unknown>[] = [];

  for (const caseDoc of casesSnap.docs) {
    const testCase = caseDoc.data();
    const collector = createEventCollector();

    await runAgentWithTools(
      {
        provider,
        model,
        systemPrompt,
        messages: [{ role: "user", content: testCase.inputPrompt }],
        userId,
        agentId,
        apiKey,
        apiKeys: apiKeys && apiKeys.length > 1 ? apiKeys : undefined,
        skipOutboundWebhooks: true,
      },
      {
        onToken: (text) => collector.addToken(text),
        onToolStart: () => {},
        onToolEnd: (result) => {
          totalToolCalls++;
          collector.addToolCall({
            name: result.name,
            args: {},
            result: result.result,
            isError: result.isError,
          });
        },
        onDone: (metrics) => {
          inputTokens += metrics.inputTokens;
          outputTokens += metrics.outputTokens;
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

    totalScore += score;
    if (passed) passedCases++;

    for (const cr of criteriaResults) {
      criteriaBreakdown[cr.criterionType] = (criteriaBreakdown[cr.criterionType] || 0) + cr.score;
    }

    gradingResults.push({
      caseName: testCase.name,
      score,
      passed,
      criteriaResults: criteriaResults.map((cr) => ({
        criterionType: cr.criterionType,
        score: cr.score,
        message: cr.message,
      })),
    });

    // (B) Persist result to grading run
    if (gradingRunId && opts?.suiteId) {
      resultWritePromises.push(
        adminDb
          .collection(`users/${userId}/agents/${agentId}/gradingSuites/${opts.suiteId}/runs/${gradingRunId}/results`)
          .add({
            caseId: testCase.id || caseDoc.id,
            passed,
            score,
            agentOutput: collector.assistantOutput.slice(0, 50000),
            toolCalls: collector.toolCalls,
            criteriaResults,
            durationMs: Date.now() - startTime,
            createdAt: FieldValue.serverTimestamp(),
          })
          .catch(() => {})
      );
    }
  }

  const finalScore = casesSnap.size > 0 ? totalScore / casesSnap.size : 0;

  // (B) Finalize grading run
  if (gradingRunId && opts?.suiteId) {
    try {
      await Promise.all([
        ...resultWritePromises,
        adminDb
          .doc(`users/${userId}/agents/${agentId}/gradingSuites/${opts.suiteId}/runs/${gradingRunId}`)
          .update({
            status: "completed",
            score: finalScore,
            passedCases,
            completedAt: FieldValue.serverTimestamp(),
          }),
      ]);
    } catch { /* best-effort */ }
  }

  // (A) Finalize session
  if (sessionId) {
    try {
      await Promise.all([
        updateSessionMetrics(userId, agentId, sessionId, {
          inputTokens,
          outputTokens,
          cost: 0,
          toolCallCount: totalToolCalls,
          messageCount: casesSnap.size * 2,
        }),
        endSessionServer(userId, agentId, sessionId),
      ]);
    } catch { /* best-effort */ }
  }

  return {
    score: finalScore,
    criteriaBreakdown,
    gradingResults,
    tokensUsed: { input: inputTokens, output: outputTokens },
    durationMs: Date.now() - startTime,
  };
}

// Helper to get grading results for mutation analysis
async function getLatestGradingResults(
  systemPrompt: string,
  casesSnap: FirebaseFirestore.QuerySnapshot,
  provider: string,
  model: string,
  userId: string,
  agentId: string,
  apiKey?: string,
  apiKeys?: string[]
) {
  const result = await runGradingSuiteOnPrompt(systemPrompt, casesSnap, provider, model, userId, agentId, apiKey, apiKeys);
  return result.gradingResults;
}
