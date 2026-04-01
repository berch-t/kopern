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
import { cn } from "@/lib/utils";
import { LocalizedLink } from "@/components/LocalizedLink";
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
  Sparkles,
  FlaskConical,
  ChevronDown,
  Eye,
  ShieldAlert,
} from "lucide-react";

type TabMode = "autotune" | "autofix" | "stress_lab" | "tournament" | "distillation" | "evolution";

interface IterationEvent {
  index: number;
  gradingScore: number;
  delta: number;
  status: "keep" | "discard" | "crash" | "baseline";
  description: string;
}

interface DistillationStudent {
  config: { modelProvider: string; modelId: string };
  score: number;
  costPerRequest: number;
  qualityRetention: number;
  costReduction: number;
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
  const [distillationStudents, setDistillationStudents] = useState<DistillationStudent[]>([]);
  const [distillationTeacher, setDistillationTeacher] = useState<{ score: number; costPerRequest: number; modelId: string } | null>(null);
  const [evolutionGenerations, setEvolutionGenerations] = useState<Record<string, unknown>[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Format raw status strings into human-readable i18n text
  const statusLabels = tOpt.status as Record<string, string> | undefined;
  const formatStatus = useCallback((raw: string): string => {
    if (!raw || !statusLabels) return raw;

    // Direct match (loading, analyzing, validating, probing, etc.)
    if (statusLabels[raw]) return statusLabels[raw];

    // generation_N pattern
    const genMatch = raw.match(/^generation_(\d+)$/);
    if (genMatch) return (statusLabels.generation || "Generation {n}…").replace("{n}", genMatch[1]);

    // round_N pattern
    const roundMatch = raw.match(/^round_(\d+)$/);
    if (roundMatch) return (statusLabels.round || "Round {n}…").replace("{n}", roundMatch[1]);

    // evaluating_MODEL pattern (distillation students)
    const evalMatch = raw.match(/^evaluating_(.+)$/);
    if (evalMatch) {
      const modelName = evalMatch[1].replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return (statusLabels.evaluating_model || "Evaluating {model}…").replace("{model}", modelName);
    }

    return raw;
  }, [statusLabels]);

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
    setDistillationStudents([]);
    setDistillationTeacher(null);
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
        setStatusMessage((statusLabels?.iteration || "Iteration {n}: {desc}").replace("{n}", String(data.index)).replace("{desc}", String(data.description)));
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
        setStatusMessage((statusLabels?.diagnostic || "Diagnosis: {detail}").replace("{detail}", String((data as Record<string, unknown>).rootCause)));
        break;
      case "result":
        if (activeTab === "autofix") {
          setBestScore(data.newScore as number);
          if (data.patchedPrompt) setBestPrompt(data.patchedPrompt as string);
        }
        if (activeTab === "distillation") {
          setBestScore(data.teacherScore as number);
          setDistillationTeacher({
            score: data.teacherScore as number,
            costPerRequest: data.teacherCostPerRequest as number,
            modelId: String(((data as Record<string, unknown>).teacherConfig as Record<string, unknown>)?.modelId || ""),
          });
          if (Array.isArray(data.students)) {
            setDistillationStudents(data.students as DistillationStudent[]);
          }
        }
        break;
      case "vulnerability":
        setStatusMessage((statusLabels?.vulnerability || "Vulnerability: {detail}").replace("{detail}", String((data as Record<string, unknown>).description)));
        break;
      case "report":
        setStressReport(data);
        setBestScore(data.robustnessScore as number);
        break;
      case "round":
        setTournamentResult(data);
        break;
      case "student": {
        const studentData = data as unknown as DistillationStudent;
        const studentModel = String(studentData.config?.modelId || "");
        const studentQuality = (studentData.qualityRetention * 100).toFixed(1);
        setStatusMessage((statusLabels?.student || "{model} — {quality}% quality").replace("{model}", studentModel).replace("{quality}", studentQuality));
        setDistillationStudents((prev) => [...prev, studentData]);
        break;
      }
      case "generation":
        setEvolutionGenerations((prev) => [...prev, data]);
        setBestScore(data.bestScore as number);
        break;
      case "error":
        toast.error(data.message as string);
        break;
    }
  }, [activeTab, tOpt, statusLabels]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleApplyPrompt = useCallback(async (promptOverride?: string) => {
    const prompt = promptOverride || bestPrompt;
    if (!user || !prompt) return;
    try {
      await updateAgent(user.uid, agentId, { systemPrompt: prompt });
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
              <TabsList className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 w-full">
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
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
                        <Label>{activeTab === "evolution" ? tOpt.maxGenerations || tOpt.maxIterations : tOpt.maxIterations}</Label>
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

                {/* Mode description card */}
                {(() => {
                  const meta = modeDescriptions[activeTab];
                  const ModeIcon = meta.icon;
                  const colorMap: Record<TabMode, string> = {
                    autotune: "bg-blue-500/10 border-blue-500/20",
                    autofix: "bg-amber-500/10 border-amber-500/20",
                    stress_lab: "bg-red-500/10 border-red-500/20",
                    tournament: "bg-purple-500/10 border-purple-500/20",
                    distillation: "bg-emerald-500/10 border-emerald-500/20",
                    evolution: "bg-pink-500/10 border-pink-500/20",
                  };
                  return (
                    <div className={cn("rounded-lg border p-3 flex items-start gap-3", colorMap[activeTab])}>
                      <div className={cn("mt-0.5 rounded-md p-1.5", meta.color.replace("text-", "bg-").replace("500", "500/15"))}>
                        <ModeIcon className={cn("h-4 w-4", meta.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium mb-0.5">{tOpt.modes[activeTab]}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{tOpt.descriptions[activeTab]}</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleRun}
                    disabled={running || !selectedSuite || suites.length === 0}
                    className="gap-2 text-black"
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
        {(iterations.length > 0 || statusMessage || bestScore !== null || distillationStudents.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {/* Progress chart — only for autotune/autofix/evolution (modes using iterations) */}
            {iterations.length > 0 && !["distillation", "tournament", "stress_lab"].includes(activeTab) && (
              <FadeIn>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {tOpt.progressChart}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Score progression — line-style chart */}
                    <div className="relative h-40">
                      {/* Y-axis labels */}
                      <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>10</span>
                        <span>5</span>
                        <span>0</span>
                      </div>
                      {/* Grid lines */}
                      <div className="absolute left-9 right-0 top-0 bottom-6">
                        <div className="absolute top-0 left-0 right-0 border-t border-dashed border-border/50" />
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/50" />
                        <div className="absolute bottom-0 left-0 right-0 border-t border-border" />
                      </div>
                      {/* Bars */}
                      <div className="absolute left-9 right-0 top-0 bottom-6 flex items-end gap-1.5 px-1">
                        {iterations.map((iter, i) => {
                          const pct = Math.max(iter.gradingScore * 100, 2);
                          const isKeep = iter.status === "keep" || iter.status === "baseline";
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                              <span className="text-[10px] tabular-nums font-medium" style={{ color: isKeep ? "var(--color-emerald-500, #10b981)" : "var(--color-muted-foreground)" }}>
                                {(iter.gradingScore * 10).toFixed(1)}
                              </span>
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${pct}%` }}
                                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                                className={cn(
                                  "w-full rounded-t-sm min-h-[2px]",
                                  isKeep ? "bg-emerald-500" : iter.status === "crash" ? "bg-red-500" : "bg-muted-foreground/20"
                                )}
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis labels */}
                      <div className="absolute left-9 right-0 bottom-0 flex gap-1.5 px-1">
                        {iterations.map((iter, i) => (
                          <div key={i} className="flex-1 text-center text-[10px] tabular-nums text-muted-foreground">
                            {iter.index}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> {tOpt.kept}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-muted-foreground/20" /> {tOpt.discarded}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            )}

            {/* Iteration log — hide for modes with their own views */}
            {iterations.length > 0 && !["distillation", "tournament", "stress_lab"].includes(activeTab) && (
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
                        <Button onClick={() => handleApplyPrompt()} className="gap-2">
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
              <StressLabReportView
                report={stressReport}
                tOpt={tOpt}
                onApplyPrompt={(prompt) => { setBestPrompt(prompt); handleApplyPrompt(prompt); }}
              />
            )}

            {/* Distillation Results */}
            {distillationStudents.length > 0 && (
              <FadeIn delay={0.15}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ArrowDown className="h-4 w-4 text-cyan-500" />
                      {tOpt.distillationResults}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Teacher baseline */}
                    {distillationTeacher && (
                      <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                          <Sparkles className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{tOpt.teacherModel}</p>
                          <p className="text-xs text-muted-foreground">{distillationTeacher.modelId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold tabular-nums">{(distillationTeacher.score * 10).toFixed(2)}/10</p>
                          <p className="text-xs text-muted-foreground tabular-nums">${distillationTeacher.costPerRequest.toFixed(4)}/{tOpt.cost?.replace(/.*\//, "") || "req"}</p>
                        </div>
                      </div>
                    )}

                    {/* Student comparison table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="pb-2 font-medium">{tOpt.config}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.score}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.qualityRetention}</th>
                            <th className="pb-2 font-medium text-right">{tOpt.costReduction}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {distillationStudents.map((s, i) => {
                            const isViable = s.qualityRetention >= 0.8;
                            const isBest = isViable && distillationStudents
                              .filter((x) => x.qualityRetention >= 0.8)
                              .every((x) => s.costReduction >= x.costReduction);
                            return (
                              <tr key={i} className={cn("border-b last:border-0", isBest && "bg-emerald-500/5")}>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{s.config.modelId}</span>
                                    {isBest && (
                                      <Badge variant="default" className="text-[10px] px-1.5 py-0">{tOpt.bestROI}</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{s.config.modelProvider}</span>
                                </td>
                                <td className="py-2.5 text-right tabular-nums">{(s.score * 10).toFixed(2)}/10</td>
                                <td className="py-2.5 text-right">
                                  <span className={cn(
                                    "tabular-nums font-medium",
                                    s.qualityRetention >= 0.9 ? "text-emerald-500" :
                                    s.qualityRetention >= 0.8 ? "text-yellow-500" : "text-red-500"
                                  )}>
                                    {(s.qualityRetention * 100).toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <span className={cn(
                                    "tabular-nums font-medium",
                                    s.costReduction > 0 ? "text-emerald-500" : "text-red-500"
                                  )}>
                                    {s.costReduction > 0 ? "−" : "+"}{Math.abs(s.costReduction * 100).toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Quality retention bar chart */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-medium text-muted-foreground">{tOpt.qualityRetention}</p>
                      {distillationStudents.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-32 truncate">{s.config.modelId}</span>
                          <div className="flex-1 h-5 rounded-full bg-muted/30 overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(s.qualityRetention * 100, 100)}%` }}
                              transition={{ duration: 0.6, delay: i * 0.1, ease: "easeOut" }}
                              className={cn(
                                "h-full rounded-full",
                                s.qualityRetention >= 0.9 ? "bg-emerald-500" :
                                s.qualityRetention >= 0.8 ? "bg-yellow-500" : "bg-red-500"
                              )}
                            />
                            <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] tabular-nums font-medium">
                              {(s.qualityRetention * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                      {/* 80% threshold line label */}
                      <div className="flex items-center gap-3">
                        <span className="w-32" />
                        <div className="flex-1 relative h-0">
                          <div className="absolute left-[80%] -top-[calc(0.25rem+var(--spacing)*2*var(--count,1))] bottom-0 border-l border-dashed border-yellow-500/50" />
                          <span className="absolute left-[80%] -translate-x-1/2 top-0 text-[9px] text-yellow-500/70">80%</span>
                        </div>
                      </div>
                    </div>
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

            {/* Evolution Progress */}
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
                    <div className="relative h-40">
                      {/* Y-axis */}
                      <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] tabular-nums text-muted-foreground">
                        <span>10</span>
                        <span>5</span>
                        <span>0</span>
                      </div>
                      {/* Grid */}
                      <div className="absolute left-9 right-0 top-0 bottom-6">
                        <div className="absolute top-0 left-0 right-0 border-t border-dashed border-border/50" />
                        <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-border/50" />
                        <div className="absolute bottom-0 left-0 right-0 border-t border-border" />
                      </div>
                      {/* Bars — best score + avg score */}
                      <div className="absolute left-9 right-0 top-0 bottom-6 flex items-end gap-3 px-1">
                        {evolutionGenerations.map((gen, i) => {
                          const bestPct = Math.max((gen.bestScore as number) * 100, 2);
                          const avgPct = Math.max((gen.avgScore as number || 0) * 100, 2);
                          return (
                            <div key={i} className="flex-1 flex items-end gap-0.5 min-w-0">
                              {/* Avg bar */}
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <span className="text-[9px] tabular-nums text-muted-foreground">
                                  {((gen.avgScore as number || 0) * 10).toFixed(1)}
                                </span>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${avgPct}%` }}
                                  transition={{ duration: 0.4, delay: i * 0.08 }}
                                  className="w-full rounded-t-sm bg-pink-500/25"
                                />
                              </div>
                              {/* Best bar */}
                              <div className="flex-1 flex flex-col items-center gap-0.5">
                                <span className="text-[10px] tabular-nums font-medium text-pink-500">
                                  {((gen.bestScore as number) * 10).toFixed(1)}
                                </span>
                                <motion.div
                                  initial={{ height: 0 }}
                                  animate={{ height: `${bestPct}%` }}
                                  transition={{ duration: 0.4, delay: i * 0.08 + 0.05 }}
                                  className="w-full rounded-t-sm bg-pink-500"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis */}
                      <div className="absolute left-9 right-0 bottom-0 flex gap-3 px-1">
                        {evolutionGenerations.map((gen, i) => (
                          <div key={i} className="flex-1 text-center text-[10px] tabular-nums text-muted-foreground">
                            G{gen.index as number}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-pink-500" /> Best
                      </span>
                      <span className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm bg-pink-500/25" /> Avg
                      </span>
                      <span className="ml-auto">
                        {tOpt.generationCount}: {evolutionGenerations.length} | {tOpt.populationSize}: {((evolutionGenerations[evolutionGenerations.length - 1]?.population as unknown[])?.length || 0)}
                      </span>
                    </div>
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
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="shimmer-text font-medium">{formatStatus(statusMessage)}</span>
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
                {runs.slice(0, 10).map((run) => {
                  const modeMeta = modeDescriptions[run.mode as TabMode];
                  const ModeIcon = modeMeta?.icon || FlaskConical;
                  const modeColor = modeMeta?.color || "text-muted-foreground";
                  return (
                    <LocalizedLink
                      key={run.id}
                      href={`/agents/${agentId}/optimize/${run.id}`}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <ModeIcon className={cn("h-4 w-4", modeColor)} />
                        <Badge variant={run.status === "completed" ? "default" : run.status === "error" ? "destructive" : "secondary"}>
                          {run.status}
                        </Badge>
                        <span className="font-medium">{tOpt.modes[run.mode] || run.mode}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {(run.bestScore * 10).toFixed(2)}/10
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground text-xs">
                        <span>{run.iterationCount} {tOpt.iterations}</span>
                        <Separator orientation="vertical" className="h-3" />
                        <span>
                          {run.totalTokensInput + run.totalTokensOutput > 1000
                            ? `${((run.totalTokensInput + run.totalTokensOutput) / 1000).toFixed(1)}K tokens`
                            : `${run.totalTokensInput + run.totalTokensOutput} tokens`}
                        </span>
                        <ChevronDown className="h-3 w-3 -rotate-90" />
                      </div>
                    </LocalizedLink>
                  );
                })}
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

// ---------------------------------------------------------------------------
// Stress Lab Report — detailed vulnerability view with expandable cards
// ---------------------------------------------------------------------------

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  prompt_injection: { label: "Prompt Injection", color: "text-red-500" },
  jailbreak: { label: "Jailbreak", color: "text-red-600" },
  hallucination: { label: "Hallucination", color: "text-amber-500" },
  edge_case: { label: "Edge Case", color: "text-orange-500" },
  tool_confusion: { label: "Tool Confusion", color: "text-purple-500" },
};

function StressLabReportView({
  report,
  tOpt,
  onApplyPrompt,
}: {
  report: Record<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
  onApplyPrompt: (prompt: string) => void;
}) {
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [showHardenedPrompt, setShowHardenedPrompt] = useState(false);

  interface VulnData {
    severity: string; category: string; description: string;
    isSystemic: boolean; patchApplied: boolean;
    adversarialPrompt?: string; expectedBehavior?: string;
    agentOutput?: string; judgeScore?: number; judgeReasoning?: string;
    variants?: { prompt: string; failed: boolean }[];
    patchDescription?: string;
  }
  const vulnerabilities = (report.vulnerabilities || []) as VulnData[];
  const hardenedPrompt = report.hardenedPrompt as string | null;

  return (
    <FadeIn delay={0.15}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            {tOpt.securityReport}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats grid */}
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{report.totalCases as number}</p>
              <p className="text-xs text-muted-foreground">{tOpt.totalTests}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-emerald-500">{report.passedCases as number}</p>
              <p className="text-xs text-muted-foreground">{tOpt.passed}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{((report.robustnessScore as number) * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">{tOpt.robustness}</p>
            </div>
          </div>

          {/* Vulnerabilities — expandable */}
          {vulnerabilities.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{tOpt.vulnerabilities}</p>
              {vulnerabilities.map((v, i) => {
                const isExpanded = expandedVuln === i;
                const cat = CATEGORY_LABELS[v.category] || { label: v.category, color: "text-muted-foreground" };
                const variants = v.variants || [];

                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border transition-colors",
                      v.severity === "critical" ? "border-destructive/30" : "border-border"
                    )}
                  >
                    {/* Header — clickable */}
                    <button
                      onClick={() => setExpandedVuln(isExpanded ? null : i)}
                      className="flex w-full items-start gap-2 p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <ShieldAlert className={cn("h-4 w-4 mt-0.5 shrink-0", v.severity === "critical" ? "text-destructive" : "text-amber-500")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <Badge variant={v.severity === "critical" ? "destructive" : "secondary"} className="text-xs">
                            {String(v.severity).toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <span className={cat.color}>{cat.label}</span>
                          </Badge>
                          {v.isSystemic && (
                            <Badge variant="destructive" className="text-xs">
                              {tOpt.systemic}
                            </Badge>
                          )}
                          {v.patchApplied && (
                            <Badge variant="default" className="text-xs bg-emerald-500">
                              {tOpt.patchApplied}
                            </Badge>
                          )}
                          {typeof v.judgeScore === "number" && (
                            <span className={cn("text-xs tabular-nums font-medium", v.judgeScore >= 0.7 ? "text-emerald-500" : v.judgeScore >= 0.4 ? "text-amber-500" : "text-destructive")}>
                              {(v.judgeScore! * 10).toFixed(1)}/10
                            </span>
                          )}
                        </div>
                        {/* Judge reasoning or description */}
                        <p className="text-sm text-muted-foreground">{v.judgeReasoning || v.description}</p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1", isExpanded && "rotate-180")} />
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t p-3 space-y-3 bg-muted/20">
                        {/* Adversarial prompt */}
                        {v.adversarialPrompt && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.adversarialPrompt}</p>
                            <pre className="whitespace-pre-wrap text-xs bg-muted rounded p-2 max-h-[150px] overflow-y-auto">
                              {v.adversarialPrompt}
                            </pre>
                          </div>
                        )}

                        {/* Expected behavior */}
                        {v.expectedBehavior && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.expectedBehavior}</p>
                            <p className="text-xs bg-emerald-500/10 rounded p-2">{v.expectedBehavior}</p>
                          </div>
                        )}

                        {/* Agent output */}
                        {v.agentOutput && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.agentResponse}</p>
                            <pre className="whitespace-pre-wrap text-xs bg-destructive/10 rounded p-2 max-h-[200px] overflow-y-auto">
                              {v.agentOutput}
                            </pre>
                          </div>
                        )}

                        {/* Variants tested */}
                        {variants.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">
                              {tOpt.variantsTested} ({variants.length})
                            </p>
                            <div className="space-y-1">
                              {variants.map((variant, vi) => (
                                <div key={vi} className="flex items-start gap-2 text-xs">
                                  {variant.failed ? (
                                    <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                                  ) : (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                  )}
                                  <span className="text-muted-foreground break-all">{variant.prompt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Patch description */}
                        {v.patchDescription && (
                          <div className="flex items-start gap-2 text-xs p-2 rounded bg-emerald-500/10">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{v.patchDescription as string}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hardened Prompt — preview + apply */}
          {typeof hardenedPrompt === "string" && hardenedPrompt && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{tOpt.previewHardenedPrompt}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHardenedPrompt(!showHardenedPrompt)}
                    className="gap-1.5"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {showHardenedPrompt ? "Hide" : "Preview"}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApplyPrompt(hardenedPrompt)}
                    className="gap-1.5"
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {tOpt.applyHardenedPrompt}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{tOpt.hardenedPromptDesc}</p>
              {showHardenedPrompt && (
                <ScrollArea className="h-64 rounded-lg border">
                  <pre className="whitespace-pre-wrap text-xs p-3 font-mono">
                    {hardenedPrompt}
                  </pre>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
