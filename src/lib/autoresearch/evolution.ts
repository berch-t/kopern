// Evolution Engine — Phase 4: Multi-dimensional population-based optimization

import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { thinkingLevels } from "@/lib/pi-mono/providers";
import { getAvailableModelsForUser, checkOllamaReachable, resolveProviderKey, type AvailableModel } from "./available-models";
import { proposeMutation } from "./analyzer";
import { createRun, completeRun, trackAutoresearchUsage, logIteration, failRun } from "./history";
import type {
  EvolutionCandidate,
  EvolutionGeneration,
  EvolutionResult,
  AutoResearchRun,
  AutoResearchConfig,
  MutationDimension,
} from "./types";
import type { AgentDoc } from "@/lib/firebase/firestore";

const POPULATION_SIZE = 4;

export interface EvolutionCallbacks {
  onStatus: (status: string) => void;
  onGeneration: (gen: EvolutionGeneration) => void;
  onResult: (result: EvolutionResult) => void;
  onError: (error: Error) => void;
}

export async function runEvolution(
  config: AutoResearchConfig,
  callbacks: EvolutionCallbacks
): Promise<EvolutionResult | null> {
  const { userId, agentId, suiteId, maxIterations, mutationDimensions } = config;
  let runId: string | null = null;
  // maxIterations = number of generations (not divided by population)
  const maxGenerations = Math.max(maxIterations, 1);

  try {
    // Pre-check Ollama connectivity before resolving available models
    await checkOllamaReachable();

    // Load agent
    const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
    if (!agentSnap.exists) throw new Error("Agent not found");
    const agentData = agentSnap.data()!;
    const provider = agentData.modelProvider || "anthropic";
    const model = agentData.modelId || "claude-sonnet-4-6";

    // Resolve API key from user Firestore settings
    const apiKey = await resolveProviderKey(userId, provider);

    // Load skills
    let skillsXml = "";
    const skillsSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/skills`)
      .get();
    if (!skillsSnap.empty) {
      skillsXml = `\n\n<skills>\n${skillsSnap.docs
        .map((d) => `<skill name="${d.data().name}">\n${d.data().content}\n</skill>`)
        .join("\n\n")}\n</skills>`;
    }

    // Load cases
    const casesSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/gradingSuites/${suiteId}/cases`)
      .orderBy("orderIndex")
      .get();
    if (casesSnap.empty) throw new Error("No grading cases found");

    // Create run
    runId = await createRun(config);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const generations: EvolutionGeneration[] = [];

    // Initialize population with current config
    let population: EvolutionCandidate[] = [{
      id: "gen0-0",
      generation: 0,
      config: {
        systemPrompt: agentData.systemPrompt,
        modelProvider: agentData.modelProvider,
        modelId: agentData.modelId,
        thinkingLevel: agentData.thinkingLevel,
      },
      score: 0,
      criteriaScores: {},
      parentId: null,
      mutationDescription: "Original configuration",
    }];

    // Evaluate initial population
    callbacks.onStatus("evaluating_initial");

    const initialResult = await evaluateCandidate(
      population[0],
      casesSnap,
      skillsXml,
      userId,
      agentId
    );
    population[0].score = initialResult.score;
    population[0].criteriaScores = initialResult.criteriaScores;
    totalInputTokens += initialResult.inputTokens;
    totalOutputTokens += initialResult.outputTokens;

    const gen0: EvolutionGeneration = {
      index: 0,
      population: [...population],
      bestScore: population[0].score,
      avgScore: population[0].score,
    };
    generations.push(gen0);
    callbacks.onGeneration(gen0);

    // Available models for model mutation
    const availableModels = await getAvailableModelsForUser(userId);

    // --- EVOLUTION LOOP ---
    for (let gen = 1; gen <= maxGenerations; gen++) {
      callbacks.onStatus(`generation_${gen}`);

      // 1. MUTATION — generate variants from best candidates
      const newCandidates: EvolutionCandidate[] = [];

      // Build grading context from last evaluation for better prompt mutations
      const lastEvalResults = population
        .filter((c) => c.score > 0)
        .map((c) => ({
          caseName: c.mutationDescription,
          score: c.score,
          passed: c.score >= 0.7,
          criteriaResults: Object.entries(c.criteriaScores)
            .filter(([k]) => !k.startsWith("_"))
            .map(([k, v]) => ({ criterionType: k, score: v, message: `Score: ${v.toFixed(2)}` })),
        }));

      for (let i = 0; i < Math.min(population.length, 2); i++) {
        const parent = population[i];

        // Generate mutations for each dimension
        for (const dimension of mutationDimensions) {
          const candidate = await mutateCandidate(
            parent,
            dimension,
            gen,
            newCandidates.length,
            lastEvalResults,
            generations.map((g) => ({
              index: g.index,
              timestamp: Date.now(),
              configSnapshot: {},
              gradingScore: g.bestScore,
              criteriaBreakdown: {},
              delta: g.index > 0 ? g.bestScore - generations[g.index - 1].bestScore : 0,
              status: "keep" as const,
              description: `Gen ${g.index}`,
              tokensUsed: { input: 0, output: 0 },
              durationMs: 0,
            })),
            provider,
            model,
            availableModels,
            apiKey
          );

          if (candidate) {
            newCandidates.push(candidate);
            totalInputTokens += candidate.criteriaScores._mutationInputTokens || 0;
            totalOutputTokens += candidate.criteriaScores._mutationOutputTokens || 0;
          }

          if (newCandidates.length >= POPULATION_SIZE) break;
        }

        if (newCandidates.length >= POPULATION_SIZE) break;
      }

      // 2. EVALUATION — grade all candidates
      for (const candidate of newCandidates) {
        const result = await evaluateCandidate(
          candidate,
          casesSnap,
          skillsXml,
          userId,
          agentId
        );
        candidate.score = result.score;
        candidate.criteriaScores = result.criteriaScores;
        totalInputTokens += result.inputTokens;
        totalOutputTokens += result.outputTokens;
      }

      // 3. SELECTION — keep the best
      const allCandidates = [...population, ...newCandidates];
      allCandidates.sort((a, b) => b.score - a.score);
      population = allCandidates.slice(0, POPULATION_SIZE);

      const bestScore = population[0].score;
      const avgScore = population.reduce((sum, c) => sum + c.score, 0) / population.length;

      const generation: EvolutionGeneration = {
        index: gen,
        population: [...population],
        bestScore,
        avgScore,
      };
      generations.push(generation);
      callbacks.onGeneration(generation);

      // Log iteration
      await logIteration(userId, agentId, runId, {
        index: gen,
        timestamp: Date.now(),
        configSnapshot: population[0].config,
        gradingScore: bestScore,
        criteriaBreakdown: population[0].criteriaScores,
        delta: gen > 0 ? bestScore - generations[gen - 1].bestScore : 0,
        status: bestScore > generations[gen - 1].bestScore ? "keep" : "discard",
        description: `Gen ${gen}: best=${bestScore.toFixed(2)}, avg=${avgScore.toFixed(2)}, pop=${population.length}`,
        tokensUsed: { input: 0, output: 0 },
        durationMs: 0,
      });

      // Check convergence (only after 3+ generations of stagnation)
      if (config.targetScore && bestScore >= config.targetScore) break;
      if (gen >= 4 && generations[gen].bestScore === generations[gen - 2].bestScore &&
          generations[gen].bestScore === generations[gen - 3].bestScore) break;
    }

    // --- RESULT ---
    const champion = population[0];

    const result: EvolutionResult = {
      generations,
      champion,
      totalGenerations: generations.length,
      tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
    };

    // Complete run
    const run: AutoResearchRun = {
      id: runId,
      agentId,
      suiteId,
      mode: "evolution",
      status: "completed",
      config,
      iterations: [],
      baselineScore: generations[0].bestScore,
      bestScore: champion.score,
      bestIterationIndex: champion.generation,
      totalTokensUsed: { input: totalInputTokens, output: totalOutputTokens },
      totalCost: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
    await completeRun(userId, agentId, runId, run, {
      evolutionResult: {
        generations: result.generations,
        champion: result.champion,
        totalGenerations: result.totalGenerations,
      },
    });
    await trackAutoresearchUsage(userId, agentId, provider, totalInputTokens, totalOutputTokens, generations.length * POPULATION_SIZE);

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

// ---------------------------------------------------------------------------
// Evaluate a single candidate against grading suite
// ---------------------------------------------------------------------------

async function evaluateCandidate(
  candidate: EvolutionCandidate,
  casesSnap: FirebaseFirestore.QuerySnapshot,
  skillsXml: string,
  userId: string,
  agentId: string
): Promise<{ score: number; criteriaScores: Record<string, number>; inputTokens: number; outputTokens: number }> {
  const provider = candidate.config.modelProvider || "anthropic";
  const model = candidate.config.modelId || "claude-sonnet-4-6";
  const prompt = (candidate.config.systemPrompt || "") + skillsXml;
  const apiKey = await resolveProviderKey(userId, provider);

  let totalScore = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const criteriaScores: Record<string, number> = {};
  const criteriaCounts: Record<string, number> = {};

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
        skipOutboundWebhooks: true,
      },
      {
        onToken: (text) => collector.addToken(text),
        onToolStart: () => {},
        onToolEnd: (result) => {
          collector.addToolCall({ name: result.name, args: {}, result: result.result, isError: result.isError });
        },
        onDone: (metrics) => {
          totalInputTokens += metrics.inputTokens;
          totalOutputTokens += metrics.outputTokens;
        },
        onError: (err) => collector.addToken(`\nError: ${err.message}`),
      }
    );

    collector.finalize();
    const { results: criteriaResults, score } = await evaluateAllCriteria(
      testCase.criteria || [],
      collector,
      undefined,
      apiKey
    );

    totalScore += score;

    for (const cr of criteriaResults) {
      criteriaScores[cr.criterionType] = (criteriaScores[cr.criterionType] || 0) + cr.score;
      criteriaCounts[cr.criterionType] = (criteriaCounts[cr.criterionType] || 0) + 1;
    }
  }

  // Average criteria scores
  for (const key of Object.keys(criteriaScores)) {
    if (criteriaCounts[key]) {
      criteriaScores[key] /= criteriaCounts[key];
    }
  }

  return {
    score: casesSnap.size > 0 ? totalScore / casesSnap.size : 0,
    criteriaScores,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  };
}

// ---------------------------------------------------------------------------
// Mutate a candidate along a specific dimension
// ---------------------------------------------------------------------------

async function mutateCandidate(
  parent: EvolutionCandidate,
  dimension: MutationDimension,
  generation: number,
  index: number,
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[],
  history: { index: number; timestamp: number; configSnapshot: Record<string, unknown>; gradingScore: number; criteriaBreakdown: Record<string, number>; delta: number; status: "keep" | "discard" | "crash" | "baseline"; description: string; tokensUsed: { input: number; output: number }; durationMs: number }[],
  provider: string,
  model: string,
  availableModels: AvailableModel[],
  apiKey?: string
): Promise<EvolutionCandidate | null> {
  const id = `gen${generation}-${index}`;
  const newConfig = { ...parent.config };

  switch (dimension) {
    case "system_prompt": {
      // Use LLM to propose prompt mutation with context
      const { newPrompt, description, tokensUsed } = await proposeMutation(
        parent.config.systemPrompt || "",
        gradingResults,
        history,
        provider,
        model,
        apiKey
      );
      newConfig.systemPrompt = newPrompt;
      return {
        id,
        generation,
        config: newConfig,
        score: 0,
        criteriaScores: {
          _mutationInputTokens: tokensUsed.input,
          _mutationOutputTokens: tokensUsed.output,
        },
        parentId: parent.id,
        mutationDescription: description,
      };
    }

    case "model": {
      // Only pick from models with configured API keys
      const others = availableModels.filter((m) =>
        m.model !== parent.config.modelId || m.provider !== parent.config.modelProvider
      );
      if (others.length === 0) return null;
      const picked = others[Math.floor(Math.random() * others.length)];
      newConfig.modelProvider = picked.provider;
      newConfig.modelId = picked.model;
      return {
        id,
        generation,
        config: newConfig,
        score: 0,
        criteriaScores: {},
        parentId: parent.id,
        mutationDescription: `Switched model to ${picked.name}`,
      };
    }

    case "thinking_level": {
      const levels = thinkingLevels.map((l) => l.value);
      const currentIdx = levels.indexOf(parent.config.thinkingLevel || "off");
      const options = levels.filter((_, i) => i !== currentIdx);
      if (options.length === 0) return null;
      const picked = options[Math.floor(Math.random() * options.length)];
      newConfig.thinkingLevel = picked as AgentDoc["thinkingLevel"];
      return {
        id,
        generation,
        config: newConfig,
        score: 0,
        criteriaScores: {},
        parentId: parent.id,
        mutationDescription: `Changed thinking level to ${picked}`,
      };
    }

    default:
      return null;
  }
}
