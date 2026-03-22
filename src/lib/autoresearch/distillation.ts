// Prompt Distillation Lab — Phase 3c: Optimize on expensive model, distill to cheap model

import { adminDb } from "@/lib/firebase/admin";
import { runAgentWithTools } from "@/lib/tools/run-agent";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { evaluateAllCriteria } from "@/lib/grading/criteria";
import { calculateTokenCost } from "@/lib/billing/pricing";
import { providers } from "@/lib/pi-mono/providers";
import { createRun, completeRun, trackAutoresearchUsage, logIteration, failRun } from "./history";
import type { DistillationResult, AutoResearchRun } from "./types";

// Target models for distillation (cheaper/faster models)
const STUDENT_MODELS = [
  { provider: "mistral", model: "mistral-small-latest", label: "Mistral Small" },
  { provider: "openai", model: "gpt-4o-mini", label: "GPT-4o Mini" },
  { provider: "google", model: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { provider: "mistral", model: "mistral-nemo-latest", label: "Mistral Nemo" },
];

export interface DistillationConfig {
  userId: string;
  agentId: string;
  suiteId: string;
  studentModels?: { provider: string; model: string; label: string }[];
}

export interface DistillationCallbacks {
  onStatus: (status: string) => void;
  onStudent: (student: DistillationResult["students"][0]) => void;
  onResult: (result: DistillationResult) => void;
  onError: (error: Error) => void;
}

export async function runDistillation(
  config: DistillationConfig,
  callbacks: DistillationCallbacks
): Promise<DistillationResult | null> {
  const { userId, agentId, suiteId } = config;
  let runId: string | null = null;
  const studentModels = config.studentModels || STUDENT_MODELS;

  try {
    // Load agent (teacher)
    const agentSnap = await adminDb.doc(`users/${userId}/agents/${agentId}`).get();
    if (!agentSnap.exists) throw new Error("Agent not found");
    const agentData = agentSnap.data()!;
    const teacherProvider = agentData.modelProvider || "anthropic";
    const teacherModel = agentData.modelId || "claude-sonnet-4-6";
    const systemPrompt = agentData.systemPrompt || "";

    // Load skills
    let fullPrompt = systemPrompt;
    const skillsSnap = await adminDb
      .collection(`users/${userId}/agents/${agentId}/skills`)
      .get();
    if (!skillsSnap.empty) {
      fullPrompt += `\n\n<skills>\n${skillsSnap.docs
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
    runId = await createRun({
      agentId,
      userId,
      suiteId,
      mode: "distillation",
      maxIterations: 1 + studentModels.length,
      mutationDimensions: ["model"],
      strategy: "llm_guided",
    });

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // --- PHASE 1: TEACHER evaluation ---
    callbacks.onStatus("evaluating_teacher");

    const teacherResult = await evaluateModel(
      fullPrompt, casesSnap, teacherProvider, teacherModel, userId, agentId
    );
    totalInputTokens += teacherResult.inputTokens;
    totalOutputTokens += teacherResult.outputTokens;

    await logIteration(userId, agentId, runId, {
      index: 0,
      timestamp: Date.now(),
      configSnapshot: { modelProvider: teacherProvider, modelId: teacherModel },
      gradingScore: teacherResult.score,
      criteriaBreakdown: {},
      delta: 0,
      status: "baseline",
      description: `Teacher: ${teacherProvider}/${teacherModel} — score ${teacherResult.score.toFixed(2)}`,
      tokensUsed: { input: teacherResult.inputTokens, output: teacherResult.outputTokens },
      durationMs: teacherResult.durationMs,
    });

    // --- PHASE 2: STUDENT evaluations ---
    const students: DistillationResult["students"] = [];

    for (let i = 0; i < studentModels.length; i++) {
      const student = studentModels[i];
      callbacks.onStatus(`evaluating_${student.label.replace(/\s/g, "_").toLowerCase()}`);

      try {
        const studentResult = await evaluateModel(
          fullPrompt, casesSnap, student.provider, student.model, userId, agentId
        );
        totalInputTokens += studentResult.inputTokens;
        totalOutputTokens += studentResult.outputTokens;

        const qualityRetention = teacherResult.score > 0
          ? studentResult.score / teacherResult.score
          : 0;
        const costReduction = teacherResult.costPerRequest > 0
          ? 1 - (studentResult.costPerRequest / teacherResult.costPerRequest)
          : 0;

        const studentEntry = {
          config: { modelProvider: student.provider, modelId: student.model },
          score: studentResult.score,
          costPerRequest: studentResult.costPerRequest,
          qualityRetention,
          costReduction,
        };

        students.push(studentEntry);
        callbacks.onStudent(studentEntry);

        await logIteration(userId, agentId, runId, {
          index: i + 1,
          timestamp: Date.now(),
          configSnapshot: { modelProvider: student.provider, modelId: student.model },
          gradingScore: studentResult.score,
          criteriaBreakdown: {},
          delta: studentResult.score - teacherResult.score,
          status: studentResult.score >= teacherResult.score * 0.8 ? "keep" : "discard",
          description: `Student ${student.label}: ${(qualityRetention * 100).toFixed(1)}% quality, ${(costReduction * 100).toFixed(1)}% cheaper`,
          tokensUsed: { input: studentResult.inputTokens, output: studentResult.outputTokens },
          durationMs: studentResult.durationMs,
        });
      } catch {
        // Skip failing models
        students.push({
          config: { modelProvider: student.provider, modelId: student.model },
          score: 0,
          costPerRequest: 0,
          qualityRetention: 0,
          costReduction: 0,
        });
      }
    }

    // Find best ROI
    const viableStudents = students.filter((s) => s.qualityRetention >= 0.8);
    const bestROI = viableStudents.length > 0
      ? viableStudents.reduce((best, s) =>
          s.costReduction > best.costReduction ? s : best
        )
      : null;

    const result: DistillationResult = {
      teacherConfig: { modelProvider: teacherProvider, modelId: teacherModel },
      teacherScore: teacherResult.score,
      teacherCostPerRequest: teacherResult.costPerRequest,
      students,
      bestROI: bestROI ? {
        config: bestROI.config,
        qualityRetention: bestROI.qualityRetention,
        costReduction: bestROI.costReduction,
      } : null,
      tokensUsed: { input: totalInputTokens, output: totalOutputTokens },
    };

    // Complete run
    const run: AutoResearchRun = {
      id: runId,
      agentId,
      suiteId,
      mode: "distillation",
      status: "completed",
      config: { agentId, userId, suiteId, mode: "distillation", maxIterations: 1 + studentModels.length, mutationDimensions: ["model"], strategy: "llm_guided" },
      iterations: [],
      baselineScore: teacherResult.score,
      bestScore: bestROI?.qualityRetention ? bestROI.qualityRetention * teacherResult.score : teacherResult.score,
      bestIterationIndex: 0,
      totalTokensUsed: { input: totalInputTokens, output: totalOutputTokens },
      totalCost: 0,
      startedAt: Date.now(),
      completedAt: Date.now(),
    };
    await completeRun(userId, agentId, runId, run);
    await trackAutoresearchUsage(userId, agentId, teacherProvider, totalInputTokens, totalOutputTokens, 1 + studentModels.length);

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
// Evaluate a model on all grading cases
// ---------------------------------------------------------------------------

async function evaluateModel(
  systemPrompt: string,
  casesSnap: FirebaseFirestore.QuerySnapshot,
  provider: string,
  model: string,
  userId: string,
  agentId: string
): Promise<{ score: number; costPerRequest: number; inputTokens: number; outputTokens: number; durationMs: number }> {
  const startTime = Date.now();
  let totalScore = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
    const { score } = await evaluateAllCriteria(testCase.criteria || [], collector);
    totalScore += score;
  }

  const avgScore = casesSnap.size > 0 ? totalScore / casesSnap.size : 0;
  const totalCost = calculateTokenCost(provider, totalInputTokens, totalOutputTokens);
  const costPerRequest = casesSnap.size > 0 ? totalCost / casesSnap.size : 0;

  return {
    score: avgScore,
    costPerRequest,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    durationMs: Date.now() - startTime,
  };
}
