// AutoResearch — Self-improving agent optimization system
// Inspired by tight-loop experimentation patterns with objective metrics as feedback

import type { AgentDoc } from "@/lib/firebase/firestore";

// ---------------------------------------------------------------------------
// Core configuration
// ---------------------------------------------------------------------------

export type AutoResearchMode =
  | "autofix"
  | "autotune"
  | "stress_lab"
  | "evolution"
  | "distillation"
  | "tournament";

export type MutationDimension =
  | "system_prompt"
  | "skills"
  | "tools"
  | "model"
  | "thinking_level"
  | "purpose_gate"
  | "till_done"
  | "tool_overrides";

export type MutationStrategy = "llm_guided" | "rule_based" | "user_script";

export interface AutoResearchConfig {
  agentId: string;
  userId: string;
  suiteId: string;
  mode: AutoResearchMode;
  maxIterations: number;
  targetScore?: number;
  maxTokenBudget?: number;
  mutationDimensions: MutationDimension[];
  strategy: MutationStrategy;
  userScript?: string;
}

// ---------------------------------------------------------------------------
// Iteration tracking
// ---------------------------------------------------------------------------

export interface AutoResearchIteration {
  index: number;
  timestamp: number;
  configSnapshot: Partial<AgentDoc>;
  gradingScore: number;
  criteriaBreakdown: Record<string, number>;
  delta: number;
  status: "keep" | "discard" | "crash" | "baseline";
  description: string;
  tokensUsed: { input: number; output: number };
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Run record
// ---------------------------------------------------------------------------

export interface AutoResearchRun {
  id: string;
  agentId: string;
  suiteId: string;
  mode: AutoResearchMode;
  status: "running" | "completed" | "stopped" | "error";
  config: AutoResearchConfig;
  iterations: AutoResearchIteration[];
  baselineScore: number;
  bestScore: number;
  bestIterationIndex: number;
  totalTokensUsed: { input: number; output: number };
  totalCost: number;
  startedAt: number;
  completedAt?: number;
}

// ---------------------------------------------------------------------------
// AutoFix types
// ---------------------------------------------------------------------------

export interface AutoFixDiagnostic {
  caseId: string;
  caseName: string;
  failedCriteria: {
    criterionId: string;
    criterionType: string;
    score: number;
    message: string;
  }[];
  rootCause: string;
  suggestedFix: string;
}

export interface AutoFixResult {
  diagnostics: AutoFixDiagnostic[];
  originalPrompt: string;
  patchedPrompt: string;
  promptDiff: string;
  originalScore: number;
  newScore: number | null;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// Stress Lab types
// ---------------------------------------------------------------------------

export type SeverityLevel = "critical" | "high" | "medium" | "low";

export interface AdversarialCase {
  id: string;
  category: "prompt_injection" | "edge_case" | "hallucination" | "tool_confusion" | "jailbreak";
  prompt: string;
  expectedBehavior: string;
  severity: SeverityLevel;
}

export interface StressLabVulnerability {
  caseId: string;
  category: AdversarialCase["category"];
  severity: SeverityLevel;
  description: string;
  adversarialPrompt?: string;
  expectedBehavior?: string;
  agentOutput: string;
  judgeScore?: number;
  judgeReasoning?: string;
  variants: { prompt: string; failed: boolean }[];
  isSystemic: boolean;
  patchApplied: boolean;
  patchDescription?: string;
}

export interface StressLabReport {
  totalCases: number;
  passedCases: number;
  robustnessScore: number;
  vulnerabilities: StressLabVulnerability[];
  hardenedPrompt: string | null;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// Tournament types
// ---------------------------------------------------------------------------

export interface TournamentCandidate {
  id: string;
  label: string;
  config: Partial<AgentDoc>;
  score: number | null;
  cost: number | null;
  latencyMs: number | null;
}

export interface TournamentResult {
  candidates: TournamentCandidate[];
  rounds: number;
  champion: TournamentCandidate;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// Distillation types
// ---------------------------------------------------------------------------

export interface DistillationResult {
  teacherConfig: Partial<AgentDoc>;
  teacherScore: number;
  teacherCostPerRequest: number;
  students: {
    config: Partial<AgentDoc>;
    score: number;
    costPerRequest: number;
    qualityRetention: number;
    costReduction: number;
  }[];
  bestROI: {
    config: Partial<AgentDoc>;
    qualityRetention: number;
    costReduction: number;
  } | null;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// Evolution Engine types
// ---------------------------------------------------------------------------

export interface EvolutionCandidate {
  id: string;
  generation: number;
  config: Partial<AgentDoc>;
  score: number;
  criteriaScores: Record<string, number>;
  parentId: string | null;
  mutationDescription: string;
}

export interface EvolutionGeneration {
  index: number;
  population: EvolutionCandidate[];
  bestScore: number;
  avgScore: number;
}

export interface EvolutionResult {
  generations: EvolutionGeneration[];
  champion: EvolutionCandidate;
  totalGenerations: number;
  tokensUsed: { input: number; output: number };
}

// ---------------------------------------------------------------------------
// SSE Events
// ---------------------------------------------------------------------------

export type AutoResearchSSEEvent =
  | { type: "status"; data: { status: string; runId: string } }
  | { type: "iteration_start"; data: { index: number; description: string } }
  | { type: "iteration_end"; data: AutoResearchIteration }
  | { type: "progress"; data: { currentScore: number; bestScore: number; iterationsLeft: number; tokensUsed: { input: number; output: number } } }
  | { type: "autofix_diagnostic"; data: AutoFixDiagnostic }
  | { type: "autofix_result"; data: AutoFixResult }
  | { type: "stress_vulnerability"; data: StressLabVulnerability }
  | { type: "stress_report"; data: StressLabReport }
  | { type: "tournament_round"; data: { round: number; candidates: TournamentCandidate[] } }
  | { type: "tournament_result"; data: TournamentResult }
  | { type: "distillation_student"; data: DistillationResult["students"][0] }
  | { type: "distillation_result"; data: DistillationResult }
  | { type: "evolution_generation"; data: EvolutionGeneration }
  | { type: "evolution_result"; data: EvolutionResult }
  | { type: "done"; data: { runId: string; bestScore: number; totalCost: number } }
  | { type: "error"; data: { message: string } };

// ---------------------------------------------------------------------------
// Callbacks for the runner
// ---------------------------------------------------------------------------

export interface AutoResearchCallbacks {
  onIterationStart: (index: number, description: string) => void;
  onIterationEnd: (iteration: AutoResearchIteration) => void;
  onProgress: (data: { currentScore: number; bestScore: number; iterationsLeft: number; tokensUsed: { input: number; output: number } }) => void;
  onComplete: (run: AutoResearchRun) => void;
  onError: (error: Error) => void;
}
