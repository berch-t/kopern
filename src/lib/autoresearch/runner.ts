// AutoTune Runner — Phase 2
// Hill-climbing optimization loop with keep/discard decisions

import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { PLAN_LIMITS, type PlanTier } from "@/lib/billing/pricing";
import { applyMutation } from "./strategies";
import { getAvailableModelsForUser, checkOllamaReachable } from "./available-models";
import { resolveProviderKey } from "@/lib/llm/resolve-key";
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

  // Resolve API key from user Firestore settings
  const apiKey = await resolveProviderKey(userId, provider);

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
    // --- ITERATION 0: BASELINE ---
    callbacks.onIterationStart(0, "Running baseline evaluation");

    const baselineResult = await runGradingSuiteOnPrompt(
      currentPrompt + baseSkillsXml,
      casesSnap,
      provider,
      model,
      userId,
      agentId,
      apiKey
    );

    const baselineIteration: AutoResearchIteration = {
      index: 0,
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

    // --- ITERATIONS 1..N ---
    for (let i = 1; i <= config.maxIterations; i++) {
      // Check stop conditions
      const stop = checkStopConditions(config, bestScore, i - 1, run.totalTokensUsed, consecutiveDiscards);
      if (stop.shouldStop) {
        break;
      }

      callbacks.onIterationStart(i, `Iteration ${i}: analyzing and proposing mutation`);
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
        apiKey
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
        apiKey
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
        iterationsLeft: config.maxIterations - i,
        tokensUsed: run.totalTokensUsed,
      });
    }

    // --- COMPLETE ---
    run.status = "completed";
    run.completedAt = Date.now();
    await completeRun(userId, agentId, runId, run, {
      autotuneResult: { bestPrompt },
    });

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
  apiKey?: string
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
  const criteriaBreakdown: Record<string, number> = {};
  const gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[] = [];

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
  }

  const finalScore = casesSnap.size > 0 ? totalScore / casesSnap.size : 0;

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
  apiKey?: string
) {
  const result = await runGradingSuiteOnPrompt(systemPrompt, casesSnap, provider, model, userId, agentId, apiKey);
  return result.gradingResults;
}
