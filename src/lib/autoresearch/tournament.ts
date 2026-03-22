// Tournament Arena — Phase 3b: A/B tournament between agent configurations

import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { providers } from "@/lib/pi-mono/providers";
import { createRun, completeRun, trackAutoresearchUsage, logIteration, failRun } from "./history";
import { generateTournamentCandidates } from "./strategies";
import { getAvailableModelsForUser, checkOllamaReachable } from "./available-models";
import { resolveProviderKey } from "@/lib/llm/resolve-key";
import type {
  TournamentCandidate,
  TournamentResult,
  AutoResearchRun,
  MutationDimension,
} from "./types";

export interface TournamentConfig {
  userId: string;
  agentId: string;
  suiteId: string;
  dimensions: MutationDimension[];
  maxCandidates: number;
  rounds: number;
}

export interface TournamentCallbacks {
  onStatus: (status: string) => void;
  onRound: (round: number, candidates: TournamentCandidate[]) => void;
  onResult: (result: TournamentResult) => void;
  onError: (error: Error) => void;
}

export async function runTournament(
  config: TournamentConfig,
  callbacks: TournamentCallbacks
): Promise<TournamentResult | null> {
  const { userId, agentId, suiteId, dimensions, maxCandidates, rounds } = config;
  let runId: string | null = null;

  try {
    // Pre-check Ollama connectivity before resolving available models
    await checkOllamaReachable();

    // Load agent
    const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
    if (!agentSnap.exists) throw new Error("Agent not found");
    const agentData = agentSnap.data()!;

    // Load skills
    let skillsXml = "";
    const skillsSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/skills`)
      .get();
    if (!skillsSnap.empty) {
      skillsXml = `\n\n<skills>\n${skillsSnap.docs
        .map((d) => {
          const s = d.data();
          return `<skill name="${s.name}">\n${s.content}\n</skill>`;
        })
        .join("\n\n")}\n</skills>`;
    }

    // Load cases
    const casesSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`)
      .orderBy("orderIndex")
      .get();

    if (casesSnap.empty) throw new Error("No grading cases found");

    // Create run record
    runId = await createRun({
      agentId,
      userId,
      suiteId,
      mode: "tournament",
      maxIterations: maxCandidates * rounds,
      mutationDimensions: dimensions,
      strategy: "llm_guided",
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Generate candidates
    callbacks.onStatus("generating_candidates");

    const baseConfig = {
      systemPrompt: agentData.systemPrompt,
      modelProvider: agentData.modelProvider,
      modelId: agentData.modelId,
      thinkingLevel: agentData.thinkingLevel,
    };

    const availableModels = await getAvailableModelsForUser(userId);
    const candidateConfigs = generateTournamentCandidates(baseConfig, dimensions, availableModels);
    const limitedConfigs = candidateConfigs.slice(0, maxCandidates);

    let candidates: TournamentCandidate[] = limitedConfigs.map((cfg, i) => {
      const providerInfo = providers.find((p) => p.id === cfg.modelProvider);
      const modelInfo = providerInfo?.models.find((m) => m.id === cfg.modelId);
      return {
        id: `candidate-${i}`,
        label: i === 0
          ? "Current Config"
          : `${modelInfo?.name || cfg.modelId}${cfg.thinkingLevel !== baseConfig.thinkingLevel ? ` (thinking: ${cfg.thinkingLevel})` : ""}`,
        config: cfg,
        score: null,
        cost: null,
        latencyMs: null,
      };
    });

    // Round-robin grading
    for (let round = 0; round < rounds; round++) {
      callbacks.onStatus(`round_${round + 1}`);

      for (let ci = 0; ci < candidates.length; ci++) {
        const candidate = candidates[ci];
        const provider = candidate.config.modelProvider || "anthropic";
        const model = candidate.config.modelId || "claude-sonnet-4-6";
        const prompt = (candidate.config.systemPrompt || "") + skillsXml;

        // Resolve API key per candidate's provider
        const apiKey = await resolveProviderKey(userId, provider);

        let caseScore = 0;
        let caseInputTokens = 0;
        let caseOutputTokens = 0;
        const startTime = Date.now();

        for (const caseDoc of casesSnap.docs) {
          const testCase = caseDoc.data();
          const collector = createEventCollector();

          await runAgentWithTools(
            {
              provider,
              model,
              systemPrompt: prompt,
              messages: [{ role: "user", content: testCase.inputPrompt }],
              userId,
              agentId,
              apiKey,
            },
            {
              onToken: (text) => collector.addToken(text),
              onToolStart: () => {},
              onToolEnd: (result) => {
                collector.addToolCall({ name: result.name, args: {}, result: result.result, isError: result.isError });
              },
              onDone: (metrics) => {
                caseInputTokens += metrics.inputTokens;
                caseOutputTokens += metrics.outputTokens;
              },
              onError: (err) => collector.addToken(`\nError: ${err.message}`),
            }
          );

          collector.finalize();
          const { score } = await evaluateAllCriteria(testCase.criteria || [], collector, undefined, apiKey);
          caseScore += score;
        }

        const latencyMs = Date.now() - startTime;
        const avgScore = casesSnap.size > 0 ? caseScore / casesSnap.size : 0;
        const cost = calculateTokenCost(provider, caseInputTokens, caseOutputTokens);

        totalInputTokens += caseInputTokens;
        totalOutputTokens += caseOutputTokens;

        // Average with previous rounds
        if (candidate.score !== null) {
          candidate.score = (candidate.score * round + avgScore) / (round + 1);
          candidate.cost = (candidate.cost! * round + cost) / (round + 1);
          candidate.latencyMs = (candidate.latencyMs! * round + latencyMs) / (round + 1);
        } else {
          candidate.score = avgScore;
          candidate.cost = cost;
          candidate.latencyMs = latencyMs;
        }

        // Log iteration
        await logIteration(userId, agentId, runId, {
          index: round * candidates.length + ci,
          timestamp: Date.now(),
          configSnapshot: candidate.config,
          gradingScore: avgScore,
          criteriaBreakdown: {},
          delta: 0,
          status: "keep",
          description: `Round ${round + 1}: ${candidate.label} scored ${avgScore.toFixed(2)}`,
          tokensUsed: { input: caseInputTokens, output: caseOutputTokens },
          durationMs: latencyMs,
        });
      }

      // Sort by score
      candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      callbacks.onRound(round + 1, [...candidates]);

      // Eliminate bottom half if not last round
      if (round < rounds - 1 && candidates.length > 2) {
        candidates = candidates.slice(0, Math.ceil(candidates.length / 2));
      }
    }

    // Champion
    const champion = candidates[0];

    const result: TournamentResult = {
      candidates,
      rounds,
      champion,
      tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
    };

    // Complete run
    const run: AutoResearchRun = {
      id: runId,
      agentId,
      suiteId,
      mode: "tournament",
      status: "completed",
      config: { agentId, userId, suiteId, mode: "tournament", maxIterations: maxCandidates * rounds, mutationDimensions: dimensions, strategy: "llm_guided" },
      iterations: [],
      baselineScore: candidates.find((c) => c.id === "candidate-0")?.score || 0,
      bestScore: champion.score || 0,
      bestIterationIndex: 0,
      totalTokensUsed: { input: totalInputTokens, output: totalOutputTokens },
      totalCost: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
    await completeRun(userId, agentId, runId, run, {
      tournamentResult: {
        candidates: result.candidates,
        rounds: result.rounds,
        champion: result.champion,
      },
    });
    await trackAutoresearchUsage(userId, agentId, champion.config.modelProvider || "anthropic", totalInputTokens, totalOutputTokens, candidates.length * rounds);

    callbacks.onResult(result);
    return result;
  } catch (err) {
    if (runId) {
      await failRun(userId, agentId, runId, (err as Error).message).catch(() => {});
    }
    callbacks.onError(err as Error);
    return null;
  }
}
