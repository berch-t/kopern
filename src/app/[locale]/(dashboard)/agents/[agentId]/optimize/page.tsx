"use client";

import { use, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import {
  agentDoc,
  gradingSuitesCollection,
  autoresearchRunsCollection,
  type AgentDoc,
  type GradingSuiteDoc,
  type AutoResearchRunDoc,
} from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { useDictionary } from "@/providers/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { StaggerChildren, staggerItem } from "@/components/motion/StaggerChildren";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Target,
  Shield,
  Trophy,
  Dna,
  ArrowDown,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  Play,
  Square,
  RotateCcw,
  Sparkles,
  FlaskConical,
} from "lucide-react";

type TabMode = "autotune" | "autofix" | "stress_lab" | "tournament" | "distillation" | "evolution";

interface IterationEvent {
  index: number;
  gradingScore: number;
  delta: number;
  status: "keep" | "discard" | "crash" | "baseline";
  description: string;
}

export default function OptimizePage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const tOpt = t.optimize;

  const { data: agent } = useDocument<AgentDoc>(
    user ? agentDoc(user.uid, agentId) : null
  );
  const { data: suites } = useCollection<GradingSuiteDoc>(
    user ? gradingSuitesCollection(user.uid, agentId) : null,
    "createdAt"
  );
  const { data: runs } = useCollection<AutoResearchRunDoc>(
    user ? autoresearchRunsCollection(user.uid, agentId) : null,
    "createdAt"
  );

  const [activeTab, setActiveTab] = useState<TabMode>("autotune");
  const [selectedSuite, setSelectedSuite] = useState<string>("");
  const [maxIterations, setMaxIterations] = useState(10);
  const [targetScore, setTargetScore] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [iterations, setIterations] = useState<IterationEvent[]>([]);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [bestPrompt, setBestPrompt] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("");
  const [stressReport, setStressReport] = useState<Record<string, unknown> | null>(null);
  const [tournamentResult, setTournamentResult] = useState<Record<string, unknown> | null>(null);
  const [distillationResult, setDistillationResult] = useState<Record<string, unknown> | null>(null);
  const [evolutionGenerations, setEvolutionGenerations] = useState<Record<string, unknown>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Select first suite by default
  if (!selectedSuite && suites.length > 0) {
    setSelectedSuite(suites[0].id);
  }

  const handleRun = useCallback(async () => {
    if (!user || !selectedSuite) return;

    setRunning(true);
    setIterations([]);
    setBestScore(null);
    setBestPrompt("");
    setStatusMessage("");
    setStressReport(null);
    setTournamentResult(null);
    setDistillationResult(null);
    setEvolutionGenerations([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let url: string;
      let body: Record<string, unknown>;

      switch (activeTab) {
        case "autotune":
          url = `/api/agents/${agentId}/autoresearch/${selectedSuite}/run`;
          body = {
            userId: user.uid,
            mode: "autotune",
            maxIterations,
            targetScore: targetScore ? parseFloat(targetScore) : undefined,
            mutationDimensions: ["system_prompt"],
            strategy: "llm_guided",
          };
          break;
        case "autofix":
          url = `/api/agents/${agentId}/autoresearch/autofix`;
          // Need to get the latest grading run for this suite
          body = { userId: user.uid, suiteId: selectedSuite, runId: "latest" };
          break;
        case "stress_lab":
          url = `/api/agents/${agentId}/autoresearch/stress-lab`;
          body = { userId: user.uid, suiteId: selectedSuite, casesCount: 10, autoHarden: true };
          break;
        case "tournament":
          url = `/api/agents/${agentId}/autoresearch/tournament`;
          body = { userId: user.uid, suiteId: selectedSuite, dimensions: ["model", "thinking_level"], maxCandidates: 6, rounds: 2 };
          break;
        case "distillation":
          url = `/api/agents/${agentId}/autoresearch/distillation`;
          body = { userId: user.uid, suiteId: selectedSuite };
          break;
        case "evolution":
          url = `/api/agents/${agentId}/autoresearch/evolution`;
          body = {
            userId: user.uid,
            suiteId: selectedSuite,
            maxIterations,
            mutationDimensions: ["system_prompt", "model", "thinking_level"],
          };
          break;
        default:
          return;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        toast.error(err.error || "AutoResearch failed");
        setRunning(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ") && eventType) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEEvent(eventType, data);
            } catch {
              // Skip invalid JSON
            }
            eventType = "";
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error(`AutoResearch error: ${(err as Error).message}`);
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }, [user, selectedSuite, activeTab, agentId, maxIterations, targetScore]);

  const handleSSEEvent = useCallback((event: string, data: Record<string, unknown>) => {
    switch (event) {
      case "status":
        setStatusMessage(String(data.status));
        break;
      case "iteration_start":
        setStatusMessage(`Iteration ${data.index}: ${data.description}`);
        break;
      case "iteration_end":
        setIterations((prev) => [...prev, data as unknown as IterationEvent]);
        break;
      case "progress":
        setBestScore(data.bestScore as number);
        break;
      case "done":
        setBestScore(data.bestScore as number);
        if (data.bestPrompt) setBestPrompt(data.bestPrompt as string);
        toast.success(tOpt.runComplete);
        break;
      case "diagnostic":
        setStatusMessage(`Diagnostic: ${(data as Record<string, unknown>).rootCause}`);
        break;
      case "result":
        if (activeTab === "autofix") {
          setBestScore(data.newScore as number);
          if (data.patchedPrompt) setBestPrompt(data.patchedPrompt as string);
        }
        break;
      case "vulnerability":
        setStatusMessage(`Vulnerability: ${(data as Record<string, unknown>).description}`);
        break;
      case "report":
        setStressReport(data);
        setBestScore(data.robustnessScore as number);
        break;
      case "round":
        setTournamentResult(data);
        break;
      case "student":
        setStatusMessage(`Student: ${((data as Record<string, unknown>).config as Record<string, unknown>)?.modelId} — ${((data as Record<string, unknown>).qualityRetention as number * 100).toFixed(1)}% quality`);
        break;
      case "generation":
        setEvolutionGenerations((prev) => [...prev, data]);
        setBestScore(data.bestScore as number);
        break;
      case "error":
        toast.error(data.message as string);
        break;
    }
  }, [activeTab, tOpt]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleApplyPrompt = useCallback(async () => {
    if (!user || !bestPrompt) return;
    try {
      await updateAgent(user.uid, agentId, { systemPrompt: bestPrompt });
      toast.success(tOpt.promptApplied);
    } catch {
      toast.error("Failed to apply prompt");
    }
  }, [user, agentId, bestPrompt, tOpt]);

  const modeDescriptions: Record<TabMode, { icon: typeof Zap; color: string }> = {
    autotune: { icon: Target, color: "text-blue-500" },
    autofix: { icon: Zap, color: "text-amber-500" },
    stress_lab: { icon: Shield, color: "text-red-500" },
    tournament: { icon: Trophy, color: "text-purple-500" },
    distillation: { icon: ArrowDown, color: "text-emerald-500" },
    evolution: { icon: Dna, color: "text-pink-500" },
  };

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FlaskConical className="h-8 w-8 text-primary" />
              {tOpt.title}
            </h1>
            <p className="text-muted-foreground mt-1">{tOpt.subtitle}</p>
          </div>
          {agent && (
            <Badge variant="outline" className="text-sm">
              {tOpt.currentScore}: {agent.latestGradingScore !== null ? `${(agent.latestGradingScore * 10).toFixed(1)}/10` : "N/A"}
            </Badge>
          )}
        </div>
      </SlideUp>

      <FadeIn delay={0.05}>
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabMode)}>
              <TabsList className="grid grid-cols-3 lg:grid-cols-6 w-full">
                {(Object.entries(modeDescriptions) as [TabMode, { icon: typeof Zap; color: string }][]).map(
                  ([mode, { icon: Icon, color }]) => (
                    <TabsTrigger key={mode} value={mode} className="gap-1.5 text-xs sm:text-sm">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="hidden sm:inline">{tOpt.modes[mode]}</span>
                      <span className="sm:hidden">{tOpt.modesShort[mode]}</span>
                    </TabsTrigger>
                  )
                )}
              </TabsList>

              {/* Configuration section — shared across all tabs */}
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-2">
                    <Label>{tOpt.gradingSuite}</Label>
                    <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                      <SelectTrigger>
                        <SelectValue placeholder={tOpt.selectSuite} />
                      </SelectTrigger>
                      <SelectContent>
                        {suites.map((suite) => (
                          <SelectItem key={suite.id} value={suite.id}>
                            {suite.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(activeTab === "autotune" || activeTab === "evolution") && (
                    <>
                      <div className="space-y-2">
                        <Label>{tOpt.maxIterations}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          value={maxIterations}
                          onChange={(e) => setMaxIterations(parseInt(e.target.value) || 10)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{tOpt.targetScore}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.1}
                          placeholder="0.9"
                          value={targetScore}
                          onChange={(e) => setTargetScore(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Mode description */}
                <p className="text-sm text-muted-foreground">{tOpt.descriptions[activeTab]}</p>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleRun}
                    disabled={running || !selectedSuite || suites.length === 0}
                    className="gap-2"
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {tOpt.running}
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        {tOpt.startRun}
                      </>
                    )}
                  </Button>

                  {running && (
                    <Button variant="destructive" onClick={handleStop} className="gap-2">
                      <Square className="h-4 w-4" />
                      {tOpt.stop}
                    </Button>
                  )}
                </div>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </FadeIn>

      {/* Results section */}
      <AnimatePresence>
        {(iterations.length > 0 || statusMessage || bestScore !== null) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Progress chart */}
            {iterations.length > 0 && (
              <FadeIn>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {tOpt.progressChart}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Score progression bar chart */}
                    <div className="flex items-end gap-1 h-32">
                      {iterations.map((iter, i) => {
                        const height = Math.max(iter.gradingScore * 100, 5);
                        const isKeep = iter.status === "keep" || iter.status === "baseline";
                        return (
                          <div
                            key={i}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {(iter.gradingScore * 10).toFixed(1)}
                            </span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              transition={{ duration: 0.3, delay: i * 0.05 }}
                              className={`w-full rounded-t ${
                                isKeep
                                  ? "bg-emerald-500"
                                  : iter.status === "crash"
                                    ? "bg-red-500"
                                    : "bg-muted-foreground/30"
                              }`}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {iter.index}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-emerald-500" /> {tOpt.kept}
                      </span>
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded bg-muted-foreground/30" /> {tOpt.discarded}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Iteration log */}
            {iterations.length > 0 && (
              <FadeIn delay={0.1}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{tOpt.iterationLog}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      <div className="space-y-2">
                        {iterations.map((iter, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 text-sm"
                          >
                            {iter.status === "keep" || iter.status === "baseline" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                            ) : iter.status === "crash" ? (
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">#{iter.index}</span>
                                <Badge
                                  variant={iter.status === "keep" || iter.status === "baseline" ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {iter.status}
                                </Badge>
                                <span className="tabular-nums text-muted-foreground">
                                  {(iter.gradingScore * 10).toFixed(2)}/10
                                </span>
                                {iter.delta !== 0 && (
                                  <span
                                    className={`tabular-nums text-xs ${
                                      iter.delta > 0 ? "text-emerald-500" : "text-red-500"
                                    }`}
                                  >
                                    {iter.delta > 0 ? "+" : ""}
                                    {(iter.delta * 10).toFixed(2)}
                                  </span>
                                )}
                              </div>
                              <p className="text-muted-foreground truncate">{iter.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Best result + Apply */}
            {bestScore !== null && !running && (
              <FadeIn delay={0.2}>
                <Card className="border-primary/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                          <Sparkles className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{tOpt.bestResult}</p>
                          <p className="text-2xl font-bold tabular-nums">
                            {(bestScore * 10).toFixed(2)}/10
                          </p>
                        </div>
                      </div>
                      {bestPrompt && (
                        <Button onClick={handleApplyPrompt} className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {tOpt.applyPrompt}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Stress Lab Report */}
            {stressReport && (
              <FadeIn delay={0.15}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      {tOpt.securityReport}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3 mb-4">
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{stressReport.totalCases as number}</p>
                        <p className="text-xs text-muted-foreground">{tOpt.totalTests}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold text-emerald-500">{stressReport.passedCases as number}</p>
                        <p className="text-xs text-muted-foreground">{tOpt.passed}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted">
                        <p className="text-2xl font-bold">{((stressReport.robustnessScore as number) * 100).toFixed(0)}%</p>
                        <p className="text-xs text-muted-foreground">{tOpt.robustness}</p>
                      </div>
                    </div>
                    {(stressReport.vulnerabilities as unknown[])?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">{tOpt.vulnerabilities}</p>
                        {(stressReport.vulnerabilities as Record<string, unknown>[]).map((v, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 rounded border text-sm">
                            <Badge variant={v.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                              {String(v.severity).toUpperCase()}
                            </Badge>
                            <span className="text-muted-foreground truncate">{v.description as string}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {typeof stressReport.hardenedPrompt === "string" && stressReport.hardenedPrompt && (
                      <div className="mt-4">
                        <Button onClick={() => { setBestPrompt(stressReport.hardenedPrompt as string); handleApplyPrompt(); }} className="gap-2">
                          <Shield className="h-4 w-4" />
                          {tOpt.applyHardenedPrompt}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Tournament Leaderboard */}
            {tournamentResult && (
              <FadeIn delay={0.15}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-purple-500" />
                      {tOpt.leaderboard}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">#</th>
                            <th className="pb-2 font-medium">{tOpt.config}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.score}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.cost}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.latency}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {((tournamentResult.candidates || []) as Record<string, unknown>[]).map((c, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-2">{i + 1}</td>
                              <td className="py-2 font-medium">{c.label as string}</td>
                              <td className="py-2 text-right tabular-nums">{((c.score as number) * 10).toFixed(2)}</td>
                              <td className="py-2 text-right tabular-nums">${(c.cost as number)?.toFixed(4)}</td>
                              <td className="py-2 text-right tabular-nums">{((c.latencyMs as number) / 1000)?.toFixed(1)}s</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Evolution Radar */}
            {evolutionGenerations.length > 0 && (
              <FadeIn delay={0.15}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Dna className="h-4 w-4 text-pink-500" />
                      {tOpt.evolutionProgress}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-32">
                      {evolutionGenerations.map((gen, i) => {
                        const height = Math.max((gen.bestScore as number) * 100, 5);
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] tabular-nums text-muted-foreground">
                              {((gen.bestScore as number) * 10).toFixed(1)}
                            </span>
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${height}%` }}
                              className="w-full rounded-t bg-pink-500"
                            />
                            <span className="text-[10px] text-muted-foreground">G{gen.index as number}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {tOpt.generationCount}: {evolutionGenerations.length} | {tOpt.populationSize}: {((evolutionGenerations[evolutionGenerations.length - 1]?.population as unknown[])?.length || 0)}
                    </p>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Status message */}
            {running && statusMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                {statusMessage}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Run History */}
      {runs.length > 0 && (
        <FadeIn delay={0.3}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{tOpt.runHistory}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {runs.slice(0, 10).map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={run.status === "completed" ? "default" : run.status === "error" ? "destructive" : "secondary"}>
                        {run.status}
                      </Badge>
                      <span className="font-medium">{run.mode}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {(run.bestScore * 10).toFixed(2)}/10
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <span>{run.iterationCount} iterations</span>
                      <Separator orientation="vertical" className="h-3" />
                      <span>
                        {run.totalTokensInput + run.totalTokensOutput > 1000
                          ? `${((run.totalTokensInput + run.totalTokensOutput) / 1000).toFixed(1)}K tokens`
                          : `${run.totalTokensInput + run.totalTokensOutput} tokens`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Empty state */}
      {suites.length === 0 && (
        <FadeIn delay={0.1}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
            <FlaskConical className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-lg font-medium">{tOpt.noSuites}</p>
            <p className="mt-1 text-sm text-muted-foreground">{tOpt.noSuitesDesc}</p>
          </div>
        </FadeIn>
      )}
    </div>
  );
}
