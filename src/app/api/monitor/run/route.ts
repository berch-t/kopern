export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { runGradingSuite } from "@/lib/grading/runner";
import { checkRateLimit, monitorRateLimit } from "@/lib/security/rate-limit";
import { monitorRunRequestSchema, validateBody } from "@/lib/security/validation";
import { createSSEStream, sseResponse } from "@/lib/utils/sse";
import { adminDb } from "@/lib/firebase/admin";
import { createEventCollector } from "@/lib/pi-mono/event-collector";
import { streamLLM } from "@/lib/llm/client";
import { generateImprovementNotes } from "@/lib/grading/improvement-notes";
import { buildMonitorGradingCases, MONITOR_CRITERIA_DEFS } from "@/lib/monitor/battery";
import { getBaseline, BASELINE_VERSION } from "@/lib/monitor/baselines";
import type { GradingCaseDoc } from "@/lib/firebase/firestore";

export async function POST(request: NextRequest) {
  // 1. Rate limit by IP (3/day)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const rl = await checkRateLimit(monitorRateLimit, ip);
  if (rl) return rl;

  // 2. Validate request
  const raw = await request.json();
  const parsed = validateBody(monitorRunRequestSchema, raw);
  if ("error" in parsed) return parsed.error;

  const { provider, model, apiKey } = parsed.data;

  // 3. Validate the API key works with a quick check
  // (Skipped — we let the first prompt fail and report error via SSE)

  // 4. Build grading cases from the monitor battery
  const gradingCases = buildMonitorGradingCases(provider, model, apiKey);

  // 5. SSE streaming
  const { stream, send, close } = createSSEStream();

  (async () => {
    try {
      send("status", {
        phase: "starting",
        message: `Initializing diagnostic for ${model}...`,
        totalCases: gradingCases.length,
      });

      // Build executor — uses the USER's API key
      const executeCase = buildMonitorExecutor(provider, model, apiKey);

      // Track latencies per case
      const latencies: Map<number, number> = new Map();

      // Wrap to measure latency and inject it into events
      const wrappedExecuteCase = async (inputPrompt: string, caseIndex?: number) => {
        const start = Date.now();
        const result = await executeCase(inputPrompt);
        const durationMs = Date.now() - start;

        // Inject durationMs into the collector for latency_benchmark evaluator
        (result as unknown as Record<string, unknown>).durationMs = durationMs;

        if (caseIndex != null) {
          latencies.set(caseIndex, durationMs);
        }

        return result;
      };

      let caseCounter = 0;
      const result = await runGradingSuite(gradingCases as (GradingCaseDoc & { id: string })[], (inputPrompt: string) => {
        return wrappedExecuteCase(inputPrompt, caseCounter++);
      }, (progress) => {
        send("progress", {
          caseIndex: progress.caseIndex,
          totalCases: progress.totalCases,
          caseName: progress.caseName,
          status: progress.status,
          score: progress.score,
          message: progress.status === "running"
            ? `Evaluating "${progress.caseName}"...`
            : `${progress.caseName}: ${progress.status === "passed" ? "Passed" : "Failed"} (${Math.round((progress.score || 0) * 100)}%)`,
        });
      });

      // 6. Aggregate criteria scores by POSITION (same pattern as grader)
      const criteriaMap = new Map<number, { scores: number[]; label: string; key: string }>();
      for (const caseResult of result.results) {
        caseResult.criteriaResults.forEach((cr, idx) => {
          if (!criteriaMap.has(idx)) {
            const def = MONITOR_CRITERIA_DEFS[idx];
            criteriaMap.set(idx, { scores: [], label: def?.name || cr.criterionType, key: def?.key || cr.criterionType });
          }
          criteriaMap.get(idx)!.scores.push(cr.score);
        });
      }

      const criteriaBreakdown = Array.from(criteriaMap.entries()).map(([, { scores, label, key }]) => ({
        criterion: key,
        label,
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
        passed: scores.every((s) => s >= 0.7),
      }));

      // 7. Compute composite score using weights from the plan
      const composite = criteriaBreakdown.reduce((sum, cb) => {
        const def = MONITOR_CRITERIA_DEFS.find(d => d.key === cb.criterion);
        return sum + cb.score * (def?.weight || 0);
      }, 0);

      // 8. Compare vs baseline
      const baseline = getBaseline(model);
      const baselineComparison = {
        baselineScore: baseline.composite,
        delta: composite - baseline.composite,
        baselineVersion: BASELINE_VERSION,
        perCriterion: criteriaBreakdown.map(cb => ({
          criterion: cb.criterion,
          userScore: cb.score,
          baselineScore: baseline[cb.criterion as keyof typeof baseline] as number || 0.8,
          delta: cb.score - ((baseline[cb.criterion as keyof typeof baseline] as number) || 0.8),
        })),
      };

      // 9. Generate improvement insights
      send("status", { phase: "analyzing", message: "Generating diagnostic insights..." });

      const kopernApiKey = process.env.ANTHROPIC_API_KEY;
      const caseResultsForAnalysis = result.results.map(r => ({
        caseName: r.caseName,
        passed: r.passed,
        score: r.score,
        expectedBehavior: gradingCases.find(gc => gc.name === r.caseName)?.expectedBehavior || "",
        agentOutput: r.agentOutput,
        criteriaResults: r.criteriaResults.map(cr => ({
          criterionType: cr.criterionType,
          passed: cr.passed,
          score: cr.score,
          message: cr.message || "",
        })),
      }));

      let insights: string[] = [];
      try {
        const analysis = await generateImprovementNotes(
          `LLM Model: ${model} (Provider: ${provider})`,
          composite,
          caseResultsForAnalysis,
          "en",
          kopernApiKey,
        );
        insights = [
          analysis.summary,
          ...analysis.notes.map(n => `[${n.severity.toUpperCase()}] ${n.title}: ${n.detail}`),
        ];
      } catch {
        insights = ["Improvement analysis could not be generated."];
      }

      // 10. Compute average latency
      const allLatencies = Array.from(latencies.values());
      const avgLatencyMs = allLatencies.length > 0
        ? Math.round(allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length)
        : 0;

      // 11. Persist to Firestore
      const runId = `mn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      try {
        const persistedResults = result.results.map((r) => ({
          caseName: r.caseName,
          passed: r.passed,
          score: r.score,
          agentOutput: r.agentOutput.slice(0, 2000),
          durationMs: r.durationMs,
          criteriaResults: r.criteriaResults.map((cr, idx) => ({
            type: MONITOR_CRITERIA_DEFS[idx]?.name || cr.criterionType,
            passed: cr.passed,
            score: cr.score,
            message: cr.message?.slice(0, 500),
          })),
        }));

        await adminDb.collection("monitorRuns").doc(runId).set({
          runId,
          provider,
          model,
          score: composite,
          criteriaBreakdown,
          baselineComparison,
          insights,
          testCount: gradingCases.length,
          avgLatencyMs,
          results: persistedResults,
          ip: hashIp(ip),
          createdAt: new Date(),
        });
      } catch {
        // Non-blocking
      }

      // 12. Send result
      send("result", {
        runId,
        provider,
        model,
        score: composite,
        criteriaBreakdown,
        baselineComparison,
        insights,
        testCount: gradingCases.length,
        avgLatencyMs,
        results: result.results.map((r) => ({
          caseName: r.caseName,
          passed: r.passed,
          score: r.score,
          agentOutput: r.agentOutput.slice(0, 2000),
          durationMs: r.durationMs,
          criteriaResults: r.criteriaResults.map((cr, idx) => ({
            type: MONITOR_CRITERIA_DEFS[idx]?.name || cr.criterionType,
            passed: cr.passed,
            score: cr.score,
            message: cr.message?.slice(0, 500),
          })),
        })),
      });

      send("done", { success: true });
    } catch (err) {
      console.error("[Monitor] Error:", err);
      send("error", {
        message: err instanceof Error ? err.message : "Diagnostic failed. Please check your API key and try again.",
      });
    } finally {
      close();
    }
  })();

  return sseResponse(stream);
}

// ─── Monitor executor ───────────────────────────────────────────────────────

function buildMonitorExecutor(provider: string, model: string, apiKey: string) {
  return async (inputPrompt: string) => {
    const collector = createEventCollector();
    const messages: { role: "user" | "assistant"; content: string }[] = [
      { role: "user", content: inputPrompt },
    ];

    await new Promise<void>((resolve, reject) => {
      streamLLM(
        {
          provider: provider as "anthropic" | "openai" | "google",
          model,
          systemPrompt: "",
          messages,
          apiKey,
        },
        {
          onToken: (text) => { collector.addToken(text); },
          onToolCall: () => {},
          onDone: () => { collector.finalize(); resolve(); },
          onError: (err) => reject(err),
        },
      );
    });

    return collector;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashIp(ip: string): string {
  // Simple hash for privacy — not cryptographic, just for grouping
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `ip_${Math.abs(hash).toString(36)}`;
}
