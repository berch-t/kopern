"use client";

import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TestCaseBuilder, type TestCase } from "@/components/grader/TestCaseBuilder";
import { ScoreCard } from "@/components/grader/ScoreCard";
import { EndpointConfig, type EndpointConfigData } from "@/components/grader/EndpointConfig";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { Loader2, Sparkles, Shield, Zap, Wand2, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import { useLocale, useDictionary } from "@/providers/LocaleProvider";

type GraderMode = "endpoint" | "prompt";

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

interface GraderResult {
  runId: string;
  mode: string;
  score: number;
  totalCases: number;
  passedCases: number;
  criteriaBreakdown: { criterion: string; label: string; score: number; passed: boolean }[];
  latencyStats?: { avg: number; min: number; max: number; p95: number };
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

const DEFAULT_ENDPOINT: EndpointConfigData = {
  url: "",
  method: "POST",
  authType: "none",
  authValue: "",
  authHeaderName: "",
  bodyTemplate: '{"message": "{{input}}"}',
  responsePath: "",
};

export default function GraderPage() {
  const locale = useLocale();
  const t = useDictionary();
  const g = t.grader;

  const thinkingEndpoint = [g.thinkingEndpoint1, g.thinkingEndpoint2, g.thinkingEndpoint3, g.thinkingEndpoint4, g.thinkingEndpoint5, g.thinkingEndpoint6, g.thinkingEndpoint7, g.thinkingEndpoint8];
  const thinkingPrompt = [g.thinkingPrompt1, g.thinkingPrompt2, g.thinkingPrompt3, g.thinkingPrompt4, g.thinkingPrompt5, g.thinkingPrompt6, g.thinkingPrompt7, g.thinkingPrompt8];

  const [mode, setMode] = useState<GraderMode>("endpoint");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [endpointConfig, setEndpointConfig] = useState<EndpointConfigData>(DEFAULT_ENDPOINT);
  const [testCases, setTestCases] = useState<TestCase[]>([
    { name: "Test 1", input: "", expected: "" },
  ]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GraderResult | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [thinkingPhrase, setThinkingPhrase] = useState("");
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const phraseIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startThinkingPhrases = () => {
    const phrases = mode === "endpoint" ? thinkingEndpoint : thinkingPrompt;
    let idx = 0;
    setThinkingPhrase(phrases[0]);
    phraseIntervalRef.current = setInterval(() => {
      idx = (idx + 1) % phrases.length;
      setThinkingPhrase(phrases[idx]);
    }, 3000);
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
            // ignore parse errors
          }
        }
      }
    }
  };

  const generateCases = useCallback(async () => {
    if (mode === "prompt" && (!systemPrompt.trim() || systemPrompt.length < 20)) {
      toast.error(g.enterLongerPrompt);
      return;
    }
    if (mode === "endpoint" && !endpointConfig.url) {
      toast.error(g.enterEndpointUrl);
      return;
    }

    setGenerating(true);
    setStreamText("");
    abortRef.current = new AbortController();

    try {
      const body = mode === "endpoint"
        ? { mode: "endpoint", endpoint: endpointConfig }
        : { mode: "prompt", system_prompt: systemPrompt };

      const res = await fetch("/api/grader/generate-cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });
      if (res.status === 429) {
        toast.error(g.rateLimitError);
        return;
      }
      if (!res.ok) {
        toast.error(g.generationFailed);
        return;
      }

      let accumulated = "";
      await consumeSSE(res, {
        token: (data) => {
          accumulated += (data as { text: string }).text;
          setStreamText(accumulated);
        },
        cases: (data) => {
          const cases = (data as { cases: TestCase[] }).cases;
          if (Array.isArray(cases) && cases.length > 0) {
            setTestCases(cases.slice(0, 5).map((c) => ({
              name: c.name || "Test",
              input: c.input || "",
              expected: c.expected || "",
            })));
            setStreamText("");
            toast.success(`${cases.length} ${g.testCaseGenerated}`);
          }
        },
        error: (data) => {
          toast.error((data as { message: string }).message || g.generationFailed);
        },
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(g.networkError);
      }
    } finally {
      setGenerating(false);
      setStreamText("");
    }
  }, [mode, systemPrompt, endpointConfig, g]);

  const runGrading = useCallback(async () => {
    const validCases = testCases.filter((tc) => tc.input.trim() && tc.expected.trim());
    if (validCases.length === 0) {
      toast.error(g.addTestCase);
      return;
    }

    if (mode === "prompt" && !systemPrompt.trim()) {
      toast.error(g.enterSystemPrompt);
      return;
    }
    if (mode === "endpoint" && !endpointConfig.url) {
      toast.error(g.enterEndpoint);
      return;
    }

    setLoading(true);
    setResult(null);
    setProgress(null);
    startThinkingPhrases();
    abortRef.current = new AbortController();

    try {
      const body = mode === "endpoint"
        ? {
            mode: "endpoint",
            test_cases: validCases,
            endpoint: {
              url: endpointConfig.url,
              method: endpointConfig.method,
              authType: endpointConfig.authType,
              authValue: endpointConfig.authValue || undefined,
              authHeaderName: endpointConfig.authHeaderName || undefined,
              bodyTemplate: endpointConfig.bodyTemplate,
              responsePath: endpointConfig.responsePath || undefined,
            },
          }
        : {
            mode: "prompt",
            system_prompt: systemPrompt,
            test_cases: validCases,
          };

      const res = await fetch("/api/grader/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (res.status === 429) {
        toast.error(g.rateLimitError);
        return;
      }
      if (!res.ok) {
        toast.error(g.gradingFailed);
        return;
      }

      await consumeSSE(res, {
        progress: (data) => {
          setProgress(data as unknown as ProgressEvent);
        },
        result: (data) => {
          setResult(data as unknown as GraderResult);
        },
        error: (data) => {
          toast.error((data as { message: string }).message || g.gradingFailed);
        },
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(g.networkError);
      }
    } finally {
      setLoading(false);
      stopThinkingPhrases();
      setProgress(null);
    }
  }, [mode, systemPrompt, testCases, endpointConfig, g]);

  const canGenerate = mode === "endpoint"
    ? !!endpointConfig.url
    : systemPrompt.trim().length >= 20;

  const canGrade = mode === "endpoint"
    ? !!endpointConfig.url && testCases.some((tc) => tc.input.trim() && tc.expected.trim())
    : !!systemPrompt.trim() && testCases.some((tc) => tc.input.trim() && tc.expected.trim());

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <SlideUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              {g.badge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              {mode === "endpoint" ? g.titleEndpoint : g.titlePrompt}
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              {mode === "endpoint" ? g.subtitleEndpoint : g.subtitlePrompt}
            </p>
          </SlideUp>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Mode tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg border border-border bg-muted/30 p-1">
            <button
              onClick={() => { setMode("endpoint"); setResult(null); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === "endpoint"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-4 w-4" />
              {g.tabEndpoint}
            </button>
            <button
              onClick={() => { setMode("prompt"); setResult(null); }}
              className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                mode === "prompt"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="h-4 w-4" />
              {g.tabPrompt}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-6">
            <FadeIn key={mode}>
              {mode === "endpoint" ? (
                <>
                  <h2 className="text-lg font-semibold">{g.endpointTitle}</h2>
                  <div className="mt-2">
                    <EndpointConfig config={endpointConfig} onChange={setEndpointConfig} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">{g.systemPromptTitle}</h2>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder={g.systemPromptPlaceholder}
                    rows={8}
                    className="mt-2 font-mono text-sm"
                    maxLength={10000}
                  />
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    {systemPrompt.length}/10,000
                  </div>
                </>
              )}
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{g.testCasesTitle}</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateCases}
                  disabled={generating || !canGenerate}
                  className="text-primary hover:text-primary/80 border-primary/30"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      {g.generating}
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                      {g.generateWithAi}
                    </>
                  )}
                </Button>
              </div>

              {generating && streamText && (
                <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 p-3 max-h-40 overflow-y-auto">
                  <p className="shimmer-text text-xs font-medium mb-2">
                    {mode === "endpoint" ? g.generatingEndpoint : g.generatingPrompt}
                  </p>
                  <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">{streamText.slice(-500)}</pre>
                </div>
              )}

              <div className="mt-2">
                <TestCaseBuilder cases={testCases} onChange={setTestCases} maxCases={5} />
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <Button
                onClick={runGrading}
                disabled={loading || !canGrade}
                className="w-full bg-primary hover:bg-primary/85 text-primary-foreground"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {g.grading}
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    {mode === "endpoint" ? g.gradeEndpoint : g.gradePrompt}
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {g.freeGradings}
                {mode === "endpoint" && ` ${g.credentialsDisclaimer}`}
              </p>
            </FadeIn>
          </div>

          {/* Right: Results */}
          <div>
            {loading && !result && (
              <FadeIn>
                <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-8 space-y-6">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 mx-auto text-primary animate-spin mb-4" />
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
                          {g.testProgress.replace("{current}", String(progress.caseIndex + 1)).replace("{total}", String(progress.totalCases))}
                        </span>
                        <span className="text-primary text-xs">
                          {progress.status === "running" ? g.running : progress.status === "passed" ? g.passed : g.failed}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
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

                  <div className="grid grid-cols-2 gap-2">
                    {["Instruction Following", "Safety & Boundaries", "Response Quality", "Concision & Format"].map((name, i) => (
                      <div
                        key={name}
                        className={`text-xs rounded-md border px-3 py-2 text-center transition-colors duration-500 ${
                          progress && progress.caseIndex >= i
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/50 text-muted-foreground/50"
                        }`}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              </FadeIn>
            )}

            {result && (
              <FadeIn>
                <ScoreCard
                  runId={result.runId}
                  score={result.score}
                  totalCases={result.totalCases}
                  passedCases={result.passedCases}
                  criteriaBreakdown={result.criteriaBreakdown}
                  locale={locale}
                  mode={result.mode as GraderMode}
                  latencyStats={result.latencyStats}
                />

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {g.testResults}
                  </h3>
                  {result.results.map((r, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-4 text-sm ${
                        r.passed
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-red-500/30 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{r.caseName}</span>
                        <span className={r.passed ? "text-emerald-400" : "text-red-400"}>
                          {Math.round(r.score * 100)}% — {r.durationMs}ms
                        </span>
                      </div>
                      <details className="group">
                        <summary className="text-xs text-primary cursor-pointer hover:text-primary/80 mb-1">
                          {g.showResponse} ({r.agentOutput.length} {g.chars})
                        </summary>
                        <p className="text-muted-foreground text-xs whitespace-pre-wrap mt-1">
                          {r.agentOutput}
                        </p>
                      </details>
                      {r.criteriaResults && r.criteriaResults.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {r.criteriaResults.map((cr, j) => (
                            <span
                              key={j}
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                cr.passed
                                  ? "border-emerald-500/30 text-emerald-400"
                                  : "border-red-500/30 text-red-400"
                              }`}
                              title={cr.message || ""}
                            >
                              {cr.type.replace(/_/g, " ")} {Math.round(cr.score * 100)}%
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </FadeIn>
            )}

            {!loading && !result && (
              <FadeIn delay={0.3}>
                <div className="rounded-xl border border-dashed border-border/50 bg-muted/20 p-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">
                    {g.resultsWillAppear}
                  </h3>
                  <p className="text-sm text-muted-foreground/70 mt-2 max-w-sm mx-auto">
                    {mode === "endpoint" ? g.emptyEndpoint : g.emptyPrompt}
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
