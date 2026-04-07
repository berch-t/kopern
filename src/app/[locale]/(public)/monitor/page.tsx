"use client";

import { useState, useRef, useCallback } from "react";
import { ApiKeyInput } from "@/components/monitor/ApiKeyInput";
import { MonitorScoreCard } from "@/components/monitor/MonitorScoreCard";
import { DiagnosticDetail } from "@/components/monitor/DiagnosticDetail";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { Loader2, Activity, Brain, Gauge, Shield, Zap, Target } from "lucide-react";
import { toast } from "sonner";
import { useDictionary } from "@/providers/LocaleProvider";

interface CriterionDetail {
  type: string;
  passed: boolean;
  score: number;
  message?: string;
}

interface CaseResult {
  caseName: string;
  passed: boolean;
  score: number;
  agentOutput: string;
  durationMs: number;
  criteriaResults: CriterionDetail[];
}

interface MonitorResult {
  runId: string;
  provider: string;
  model: string;
  score: number;
  testCount: number;
  avgLatencyMs: number;
  criteriaBreakdown: { criterion: string; label: string; score: number; passed: boolean }[];
  baselineComparison?: {
    baselineScore: number;
    delta: number;
    baselineVersion: string;
    perCriterion: { criterion: string; userScore: number; baselineScore: number; delta: number }[];
  };
  insights: string[];
  results: CaseResult[];
}

interface ProgressEvent {
  caseIndex: number;
  totalCases: number;
  caseName: string;
  status: string;
  score?: number;
  message: string;
}

const CRITERIA_ICONS = [
  { name: "Reasoning", icon: Brain },
  { name: "Instructions", icon: Target },
  { name: "Consistency", icon: Shield },
  { name: "Latency", icon: Zap },
  { name: "Edge Cases", icon: Activity },
  { name: "Quality", icon: Gauge },
];

export default function MonitorPage() {
  const t = useDictionary();
  const m = t.monitor;

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MonitorResult | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [thinkingPhrase, setThinkingPhrase] = useState("");
  const phraseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const thinkingPhrases = [
    m.thinking1, m.thinking2, m.thinking3, m.thinking4,
    m.thinking5, m.thinking6, m.thinking7, m.thinking8,
  ];

  const startThinkingPhrases = () => {
    let idx = 0;
    setThinkingPhrase(thinkingPhrases[0]);
    phraseIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % thinkingPhrases.length;
      setThinkingPhrase(thinkingPhrases[idx]);
    }, 4000);
  };

  const stopThinkingPhrases = () => {
    if (phraseIntervalRef.current) {
      clearInterval(phraseIntervalRef.current);
      phraseIntervalRef.current = null;
    }
    setThinkingPhrase("");
  };

  const consumeSSE = async (
    res: Response,
    handlers: Record<string, (data: Record<string, unknown>) => void>
  ) => {
    const reader = res.body?.getReader();
    if (!reader) return;
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            const evt = currentEvent;
            currentEvent = "";
            handlers[evt]?.(data);
          } catch {
            // ignore
          }
        }
      }
    }
  };

  const runDiagnostic = useCallback(async (provider: string, model: string, apiKey: string) => {
    setLoading(true);
    setResult(null);
    setProgress(null);
    startThinkingPhrases();

    try {
      const res = await fetch("/api/monitor/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey }),
      });

      if (res.status === 429) {
        toast.error(m.rateLimitError);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as { error?: string }).error || m.diagnosticFailed);
        return;
      }

      await consumeSSE(res, {
        progress: (data) => {
          setProgress(data as unknown as ProgressEvent);
        },
        result: (data) => {
          setResult(data as unknown as MonitorResult);
        },
        error: (data) => {
          toast.error((data as { message: string }).message || m.diagnosticFailed);
        },
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(m.networkError);
      }
    } finally {
      setLoading(false);
      stopThinkingPhrases();
      setProgress(null);
    }
  }, [m]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border/50 bg-gradient-to-b from-accent/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <SlideUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-6">
              <Activity className="h-3.5 w-3.5" />
              {m.badge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {m.title}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {m.subtitle}
            </p>
          </SlideUp>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-6">
            <FadeIn>
              <h2 className="text-lg font-semibold mb-4">{m.configTitle}</h2>
              <ApiKeyInput onSubmit={runDiagnostic} disabled={loading} />
            </FadeIn>

            <FadeIn delay={0.1}>
              <p className="text-xs text-muted-foreground text-center">
                {m.freeDiagnostics}
              </p>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-400">{m.driftWarning}</p>
                <p className="text-xs text-muted-foreground">{m.connectedDescription}</p>
              </div>
            </FadeIn>
          </div>

          {/* Right: Results */}
          <div>
            {loading && !result && (
              <FadeIn>
                <div className="rounded-xl border border-accent/20 bg-gradient-to-b from-accent/5 to-transparent p-8 space-y-6">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 mx-auto text-accent animate-spin mb-4" />
                    {thinkingPhrase && (
                      <p className="shimmer-text text-base font-semibold tracking-wide">
                        {thinkingPhrase}
                      </p>
                    )}
                  </div>

                  {progress && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {m.testProgress
                            .replace("{current}", String(progress.caseIndex + 1))
                            .replace("{total}", String(progress.totalCases))}
                        </span>
                        <span className="text-accent text-xs">
                          {progress.status === "running" ? m.running : progress.status === "passed" ? m.passed : m.failed}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-700 ease-out"
                          style={{
                            width: `${((progress.caseIndex + (progress.status === "running" ? 0.5 : 1)) / progress.totalCases) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {progress.message}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    {CRITERIA_ICONS.map(({ name, icon: Icon }, i) => (
                      <div
                        key={name}
                        className={`flex items-center gap-1.5 text-xs rounded-md border px-2 py-1.5 transition-colors duration-500 ${
                          progress && progress.caseIndex >= i * 3
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-border/50 text-muted-foreground/50"
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            {result && (
              <FadeIn>
                <MonitorScoreCard
                  runId={result.runId}
                  score={result.score}
                  model={result.model}
                  provider={result.provider}
                  testCount={result.testCount}
                  avgLatencyMs={result.avgLatencyMs}
                  criteriaBreakdown={result.criteriaBreakdown}
                  baselineComparison={result.baselineComparison}
                  insights={result.insights}
                  results={result.results}
                />

                <div className="mt-6">
                  <DiagnosticDetail results={result.results} />
                </div>
              </FadeIn>
            )}

            {!loading && !result && (
              <FadeIn delay={0.3}>
                <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {m.resultsWillAppear}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-2 max-w-sm mx-auto">
                    {m.emptyState}
                  </p>
                </div>
              </FadeIn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
