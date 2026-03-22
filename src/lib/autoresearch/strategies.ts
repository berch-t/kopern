// AutoResearch Strategies — Different approaches to mutating agent config

import type { AgentDoc } from "@/lib/firebase/firestore";
import type { MutationDimension, MutationStrategy, AutoResearchIteration } from "./types";
import { proposeMutation } from "./analyzer";
import { providers } from "@/lib/pi-mono/providers";
import { thinkingLevels } from "@/lib/pi-mono/providers";

export interface MutationResult {
  newConfig: Partial<AgentDoc>;
  description: string;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// Main mutation dispatcher
// ---------------------------------------------------------------------------

export async function applyMutation(
  strategy: MutationStrategy,
  currentConfig: Partial<AgentDoc>,
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[],
  history: AutoResearchIteration[],
  dimensions: MutationDimension[],
  provider: string,
  model: string,
  userScript?: string
): Promise<MutationResult> {
  switch (strategy) {
    case "llm_guided":
      return llmGuidedMutation(currentConfig, gradingResults, history, dimensions, provider, model);
    case "rule_based":
      return ruleBased(currentConfig, gradingResults, history, dimensions);
    case "user_script":
      return userScriptMutation(currentConfig, gradingResults, userScript);
    default:
      return llmGuidedMutation(currentConfig, gradingResults, history, dimensions, provider, model);
  }
}

// ---------------------------------------------------------------------------
// LLM-guided mutation (default — most powerful)
// ---------------------------------------------------------------------------

async function llmGuidedMutation(
  currentConfig: Partial<AgentDoc>,
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[],
  history: AutoResearchIteration[],
  dimensions: MutationDimension[],
  provider: string,
  model: string
): Promise<MutationResult> {
  const newConfig = { ...currentConfig };

  // Primary: always mutate system prompt via LLM
  if (dimensions.includes("system_prompt")) {
    const { newPrompt, description, tokensUsed } = await proposeMutation(
      currentConfig.systemPrompt || "",
      gradingResults,
      history,
      provider,
      model
    );
    newConfig.systemPrompt = newPrompt;
    return { newConfig, description, tokensUsed };
  }

  // Fallback: rule-based for non-prompt dimensions
  return ruleBased(currentConfig, gradingResults, history, dimensions);
}

// ---------------------------------------------------------------------------
// Rule-based mutations (fast, no LLM cost)
// ---------------------------------------------------------------------------

function ruleBased(
  currentConfig: Partial<AgentDoc>,
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[],
  history: AutoResearchIteration[],
  dimensions: MutationDimension[]
): MutationResult {
  const newConfig = { ...currentConfig };
  const mutations: string[] = [];

  // Try thinking level adjustment
  if (dimensions.includes("thinking_level")) {
    const currentLevel = currentConfig.thinkingLevel || "off";
    const levels = thinkingLevels.map((l) => l.value);
    const currentIndex = levels.indexOf(currentLevel);
    const avgScore = gradingResults.length > 0 ? gradingResults.reduce((sum, r) => sum + r.score, 0) / gradingResults.length : 0;

    if (avgScore < 0.5 && currentIndex < levels.length - 1) {
      newConfig.thinkingLevel = levels[currentIndex + 1] as AgentDoc["thinkingLevel"];
      mutations.push(`Increased thinking level to ${newConfig.thinkingLevel}`);
    }
  }

  // Try model upgrade/downgrade
  if (dimensions.includes("model") && mutations.length === 0) {
    const currentProvider = providers.find((p) => p.id === currentConfig.modelProvider);
    if (currentProvider) {
      const currentModelIndex = currentProvider.models.findIndex((m) => m.id === currentConfig.modelId);
      // Try upgrading to a more capable model
      if (currentModelIndex > 0) {
        const betterModel = currentProvider.models[currentModelIndex - 1];
        newConfig.modelId = betterModel.id;
        mutations.push(`Upgraded model to ${betterModel.name}`);
      }
    }
  }

  const description = mutations.length > 0 ? mutations.join("; ") : "No rule-based mutation applicable";

  return {
    newConfig,
    description,
    tokensUsed: { input: 0, output: 0 },
  };
}

// ---------------------------------------------------------------------------
// User-script mutation (sandboxed)
// ---------------------------------------------------------------------------

async function userScriptMutation(
  currentConfig: Partial<AgentDoc>,
  gradingResults: { caseName: string; score: number; passed: boolean; criteriaResults: { criterionType: string; score: number; message: string }[] }[],
  userScript?: string
): Promise<MutationResult> {
  if (!userScript) {
    return {
      newConfig: currentConfig,
      description: "No user script provided",
      tokensUsed: { input: 0, output: 0 },
    };
  }

  try {
    const { executeSandboxed } = await import("@/lib/sandbox/executor");
    const result = await executeSandboxed(userScript, {
      config: currentConfig,
      results: gradingResults,
    });

    const parsed = typeof result === "string" ? JSON.parse(result) : result;
    return {
      newConfig: { ...currentConfig, ...parsed.config },
      description: parsed.description || "User script mutation",
      tokensUsed: { input: 0, output: 0 },
    };
  } catch (err) {
    return {
      newConfig: currentConfig,
      description: `User script error: ${(err as Error).message}`,
      tokensUsed: { input: 0, output: 0 },
    };
  }
}

// ---------------------------------------------------------------------------
// Generate tournament candidates
// ---------------------------------------------------------------------------

export function generateTournamentCandidates(
  baseConfig: Partial<AgentDoc>,
  dimensions: MutationDimension[]
): Partial<AgentDoc>[] {
  const candidates: Partial<AgentDoc>[] = [baseConfig];

  // Generate model variants
  if (dimensions.includes("model")) {
    for (const provider of providers) {
      for (const model of provider.models) {
        if (model.id !== baseConfig.modelId) {
          candidates.push({
            ...baseConfig,
            modelProvider: provider.id,
            modelId: model.id,
          });
        }
      }
    }
  }

  // Generate thinking level variants
  if (dimensions.includes("thinking_level")) {
    for (const level of thinkingLevels) {
      if (level.value !== baseConfig.thinkingLevel) {
        candidates.push({
          ...baseConfig,
          thinkingLevel: level.value as AgentDoc["thinkingLevel"],
        });
      }
    }
  }

  return candidates;
}
