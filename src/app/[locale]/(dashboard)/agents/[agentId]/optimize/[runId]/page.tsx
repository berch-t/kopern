"use client";

import { use, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import {
  autoresearchRunDoc,
  autoresearchIterationsCollection,
  type AutoResearchRunDoc,
  type AutoResearchIterationDoc,
} from "@/lib/firebase/firestore";
import { updateAgent } from "@/actions/agents";
import { useDictionary } from "@/providers/LocaleProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Target,
  Zap,
  Shield,
  Trophy,
  Dna,
  ArrowDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  ChevronDown,
  Eye,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";
import { LocalizedLink } from "@/components/LocalizedLink";

const MODE_META: Record<string, { icon: typeof Target; color: string; label: string }> = {
  autotune: { icon: Target, color: "text-blue-500", label: "AutoTune" },
  autofix: { icon: Zap, color: "text-amber-500", label: "AutoFix" },
  stress_lab: { icon: Shield, color: "text-red-500", label: "Stress Lab" },
  tournament: { icon: Trophy, color: "text-purple-500", label: "Tournament" },
  distillation: { icon: ArrowDown, color: "text-emerald-500", label: "Distillation" },
  evolution: { icon: Dna, color: "text-pink-500", label: "Evolution" },
};

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  prompt_injection: { label: "Prompt Injection", color: "text-red-500" },
  jailbreak: { label: "Jailbreak", color: "text-red-600" },
  hallucination: { label: "Hallucination", color: "text-amber-500" },
  edge_case: { label: "Edge Case", color: "text-orange-500" },
  tool_confusion: { label: "Tool Confusion", color: "text-purple-500" },
};

export default function OptimizeRunDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; runId: string }>;
}) {
  const { agentId, runId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const tOpt = t.optimize;

  const { data: run, loading } = useDocument<AutoResearchRunDoc>(
    user ? autoresearchRunDoc(user.uid, agentId, runId) : null
  );
  const { data: iterations } = useCollection<AutoResearchIterationDoc>(
    user ? autoresearchIterationsCollection(user.uid, agentId, runId) : null,
    "index",
    "asc"
  );

  const handleApplyPrompt = useCallback(async (prompt: string) => {
    if (!user || !prompt) return;
    try {
      await updateAgent(user.uid, agentId, { systemPrompt: prompt });
      toast.success(tOpt.promptApplied);
    } catch {
      toast.error("Failed to apply prompt");
    }
  }, [user, agentId, tOpt]);

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading run...</div>;
  }

  if (!run) {
    return <div className="text-destructive">Run not found</div>;
  }

  const mode = MODE_META[run.mode] || MODE_META.autotune;
  const ModeIcon = mode.icon;

  return (
    <div className="space-y-6">
      {/* Back link + Header */}
      <SlideUp>
        <LocalizedLink
          href={`/agents/${agentId}/optimize`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {tOpt.backToLab}
        </LocalizedLink>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ModeIcon className={cn("h-8 w-8", mode.color)} />
              {mode.label}
            </h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={
                  run.status === "completed" ? "default" :
                  run.status === "error" ? "destructive" : "secondary"
                }
              >
                {run.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {run.iterationCount} {tOpt.iterations}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold tabular-nums">
              {(run.bestScore * 10).toFixed(2)}/10
            </p>
            <p className="text-xs text-muted-foreground">{tOpt.bestResult}</p>
          </div>
        </div>
      </SlideUp>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{tOpt.baselineScore}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{(run.baselineScore * 10).toFixed(2)}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{tOpt.bestResult}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-emerald-500">{(run.bestScore * 10).toFixed(2)}/10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{tOpt.improvement}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-bold tabular-nums", run.bestScore > run.baselineScore ? "text-emerald-500" : "text-muted-foreground")}>
              {run.bestScore > run.baselineScore ? "+" : ""}{((run.bestScore - run.baselineScore) * 10).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{tOpt.totalTokens}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {(run.totalTokensInput + run.totalTokensOutput) > 1000
                ? `${((run.totalTokensInput + run.totalTokensOutput) / 1000).toFixed(1)}K`
                : run.totalTokensInput + run.totalTokensOutput}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Iteration chart — hide for modes with their own dedicated views */}
      {iterations.length > 0 && !["distillation", "tournament", "stress_lab"].includes(run.mode) && (
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {tOpt.progressChart}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-32">
                {iterations.map((iter, i) => {
                  const height = Math.max(iter.gradingScore * 100, 5);
                  const isKeep = iter.status === "keep" || iter.status === "baseline";
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {(iter.gradingScore * 10).toFixed(1)}
                      </span>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                        className={cn(
                          "w-full rounded-t",
                          isKeep ? "bg-emerald-500" :
                          iter.status === "crash" ? "bg-red-500" : "bg-muted-foreground/30"
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground">{iter.index}</span>
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

      {/* Iteration log — hide for modes with their own dedicated views */}
      {iterations.length > 0 && !["distillation", "tournament", "stress_lab"].includes(run.mode) && (
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
                            <span className={cn("tabular-nums text-xs", iter.delta > 0 ? "text-emerald-500" : "text-red-500")}>
                              {iter.delta > 0 ? "+" : ""}{(iter.delta * 10).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-muted-foreground">{iter.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Mode-specific results */}
      {run.mode === "autotune" && run.autotuneResult && (
        <AutoTuneResultView result={run.autotuneResult} tOpt={tOpt} onApply={handleApplyPrompt} />
      )}

      {run.mode === "autofix" && run.autofixResult && (
        <AutoFixResultView result={run.autofixResult} tOpt={tOpt} onApply={handleApplyPrompt} />
      )}

      {run.mode === "stress_lab" && run.stressLabResult && (
        <StressLabResultView result={run.stressLabResult} tOpt={tOpt} onApply={handleApplyPrompt} />
      )}

      {run.mode === "tournament" && run.tournamentResult && (
        <TournamentResultView result={run.tournamentResult} tOpt={tOpt} />
      )}

      {run.mode === "distillation" && run.distillationResult && (
        <DistillationResultView result={run.distillationResult} tOpt={tOpt} />
      )}

      {run.mode === "evolution" && run.evolutionResult && (
        <EvolutionResultView result={run.evolutionResult} tOpt={tOpt} onApply={handleApplyPrompt} />
      )}

      {/* No results fallback */}
      {!run.autotuneResult && !run.autofixResult && !run.stressLabResult &&
       !run.tournamentResult && !run.distillationResult && !run.evolutionResult &&
       run.status === "completed" && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            {tOpt.noResults}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AutoTune result
// ---------------------------------------------------------------------------

function AutoTuneResultView({
  result,
  tOpt,
  onApply,
}: {
  result: NonNullable<AutoResearchRunDoc["autotuneResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
  onApply: (prompt: string) => void;
}) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <FadeIn delay={0.2}>
      <Card className="border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">{tOpt.optimizedPrompt}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrompt(!showPrompt)} className="gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {showPrompt ? "Hide" : "Preview"}
              </Button>
              <Button size="sm" onClick={() => onApply(result.bestPrompt)} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {tOpt.applyPrompt}
              </Button>
            </div>
          </div>
          {showPrompt && (
            <ScrollArea className="h-64 rounded-lg border">
              <pre className="whitespace-pre-wrap text-xs p-3 font-mono">{result.bestPrompt}</pre>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

// ---------------------------------------------------------------------------
// AutoFix result
// ---------------------------------------------------------------------------

function AutoFixResultView({
  result,
  tOpt,
  onApply,
}: {
  result: NonNullable<AutoResearchRunDoc["autofixResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
  onApply: (prompt: string) => void;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <FadeIn delay={0.2}>
      <div className="space-y-4">
        {/* Diagnostics */}
        {result.diagnostics.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                {tOpt.diagnosticsFound} ({result.diagnostics.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.diagnostics.map((d, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1">
                  <p className="text-sm font-medium">{d.caseName}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-medium">Root cause:</span> {d.rootCause}</p>
                  <p className="text-xs text-emerald-600"><span className="font-medium">Fix:</span> {d.suggestedFix}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Score comparison */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">{tOpt.originalScore}</p>
                  <p className="text-xl font-bold tabular-nums">{(result.originalScore * 10).toFixed(2)}/10</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tOpt.newScore}</p>
                  <p className={cn("text-xl font-bold tabular-nums", (result.newScore ?? 0) > result.originalScore ? "text-emerald-500" : "text-muted-foreground")}>
                    {result.newScore !== null ? `${(result.newScore * 10).toFixed(2)}/10` : "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {result.promptDiff && (
                  <Button variant="outline" size="sm" onClick={() => setShowDiff(!showDiff)} className="gap-1.5">
                    {tOpt.promptDiff}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setShowPrompt(!showPrompt)} className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
                <Button size="sm" onClick={() => onApply(result.patchedPrompt)} className="gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {tOpt.applyPrompt}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diff */}
        {showDiff && result.promptDiff && (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <pre className="text-xs p-3 font-mono whitespace-pre-wrap">
                  {result.promptDiff.split("\n").map((line, i) => (
                    <span
                      key={i}
                      className={cn(
                        "block",
                        line.startsWith("+") ? "bg-emerald-500/10 text-emerald-600" :
                        line.startsWith("-") ? "bg-red-500/10 text-red-500" : ""
                      )}
                    >
                      {line}
                    </span>
                  ))}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Full prompt preview */}
        {showPrompt && (
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-64">
                <pre className="whitespace-pre-wrap text-xs p-3 font-mono">{result.patchedPrompt}</pre>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}

// ---------------------------------------------------------------------------
// Stress Lab result
// ---------------------------------------------------------------------------

function StressLabResultView({
  result,
  tOpt,
  onApply,
}: {
  result: NonNullable<AutoResearchRunDoc["stressLabResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
  onApply: (prompt: string) => void;
}) {
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [showHardenedPrompt, setShowHardenedPrompt] = useState(false);

  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-red-500" />
            {tOpt.securityReport}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{result.totalCases}</p>
              <p className="text-xs text-muted-foreground">{tOpt.totalTests}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold text-emerald-500">{result.passedCases}</p>
              <p className="text-xs text-muted-foreground">{tOpt.passed}</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{(result.robustnessScore * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">{tOpt.robustness}</p>
            </div>
          </div>

          {/* Vulnerabilities */}
          {result.vulnerabilities.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{tOpt.vulnerabilities}</p>
              {result.vulnerabilities.map((rawV, i) => {
                const v = rawV as Record<string, unknown> & {
                  severity: string; category: string; description: string;
                  isSystemic: boolean; patchApplied: boolean;
                  adversarialPrompt?: string; expectedBehavior?: string;
                  agentOutput?: string; judgeScore?: number; judgeReasoning?: string;
                  variants?: { prompt: string; failed: boolean }[];
                };
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
                          {v.isSystemic && <Badge variant="destructive" className="text-xs">{tOpt.systemic}</Badge>}
                          {v.patchApplied && <Badge variant="default" className="text-xs bg-emerald-500">{tOpt.patchApplied}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{v.description}</p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1", isExpanded && "rotate-180")} />
                    </button>

                    {isExpanded && (
                      <div className="border-t p-3 space-y-3 bg-muted/20">
                        {v.adversarialPrompt && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.adversarialPrompt}</p>
                            <pre className="whitespace-pre-wrap text-xs bg-muted rounded p-2 max-h-[150px] overflow-y-auto">
                              {v.adversarialPrompt}
                            </pre>
                          </div>
                        )}
                        {v.expectedBehavior && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.expectedBehavior}</p>
                            <p className="text-xs bg-emerald-500/10 rounded p-2">{v.expectedBehavior}</p>
                          </div>
                        )}
                        {v.agentOutput && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.agentResponse}</p>
                            <pre className="whitespace-pre-wrap text-xs bg-destructive/10 rounded p-2 max-h-[200px] overflow-y-auto">
                              {v.agentOutput}
                            </pre>
                          </div>
                        )}
                        {variants.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{tOpt.variantsTested} ({variants.length})</p>
                            <div className="space-y-1">
                              {variants.map((variant, vi) => (
                                <div key={vi} className="flex items-start gap-2 text-xs">
                                  {variant.failed ? <XCircle className="h-3 w-3 text-destructive shrink-0 mt-0.5" /> : <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />}
                                  <span className="text-muted-foreground break-all">{variant.prompt}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Hardened prompt */}
          {result.hardenedPrompt && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-medium">{tOpt.previewHardenedPrompt}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowHardenedPrompt(!showHardenedPrompt)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {showHardenedPrompt ? "Hide" : "Preview"}
                  </Button>
                  <Button size="sm" onClick={() => onApply(result.hardenedPrompt!)} className="gap-1.5">
                    <Shield className="h-3.5 w-3.5" />
                    {tOpt.applyHardenedPrompt}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{tOpt.hardenedPromptDesc}</p>
              {showHardenedPrompt && (
                <ScrollArea className="h-64 rounded-lg border">
                  <pre className="whitespace-pre-wrap text-xs p-3 font-mono">{result.hardenedPrompt}</pre>
                </ScrollArea>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

// ---------------------------------------------------------------------------
// Tournament result
// ---------------------------------------------------------------------------

function TournamentResultView({
  result,
  tOpt,
}: {
  result: NonNullable<AutoResearchRunDoc["tournamentResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
}) {
  return (
    <FadeIn delay={0.2}>
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
                {(result.candidates as Record<string, unknown>[]).map((c, i) => (
                  <tr key={i} className={cn("border-b last:border-0", i === 0 && "bg-purple-500/5")}>
                    <td className="py-2">{i === 0 ? "🏆" : i + 1}</td>
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
  );
}

// ---------------------------------------------------------------------------
// Distillation result
// ---------------------------------------------------------------------------

function DistillationResultView({
  result,
  tOpt,
}: {
  result: NonNullable<AutoResearchRunDoc["distillationResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
}) {
  const students = result.students as { config: { modelProvider: string; modelId: string }; score: number; qualityRetention: number; costReduction: number; costPerRequest: number }[];

  return (
    <FadeIn delay={0.2}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-cyan-500" />
            {tOpt.distillationResults}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Teacher baseline */}
          <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{tOpt.teacherModel}</p>
              <p className="text-xs text-muted-foreground">Baseline</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{(result.teacherScore * 10).toFixed(2)}/10</p>
              <p className="text-xs text-muted-foreground tabular-nums">${result.teacherCostPerRequest.toFixed(4)}/req</p>
            </div>
          </div>

          {/* Student comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Model</th>
                  <th className="pb-2 font-medium text-right">{tOpt.score}</th>
                  <th className="pb-2 font-medium text-right">{tOpt.qualityRetention}</th>
                  <th className="pb-2 font-medium text-right">{tOpt.costReduction}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const retention = s.qualityRetention;
                  const viable = retention >= 0.8;
                  const isBest = viable && students
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
                          retention >= 0.9 ? "text-emerald-500" :
                          retention >= 0.8 ? "text-yellow-500" : "text-red-500"
                        )}>
                          {(retention * 100).toFixed(1)}%
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

          {/* Quality retention horizontal bars */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-medium text-muted-foreground">{tOpt.qualityRetention}</p>
            {students.map((s, i) => (
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
          </div>

          {result.bestROI && (
            <div className="rounded-lg border-emerald-500/30 border bg-emerald-500/5 p-3 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium">{tOpt.bestROI}</p>
                <p className="text-xs text-muted-foreground">
                  {(result.bestROI as Record<string, unknown>).config
                    ? ((result.bestROI as Record<string, unknown>).config as Record<string, unknown>).modelId as string
                    : "N/A"} — {((result.bestROI as Record<string, unknown>).qualityRetention as number * 100).toFixed(1)}% quality, {((result.bestROI as Record<string, unknown>).costReduction as number * 100).toFixed(1)}% cheaper
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}

// ---------------------------------------------------------------------------
// Evolution result
// ---------------------------------------------------------------------------

function EvolutionResultView({
  result,
  tOpt,
  onApply,
}: {
  result: NonNullable<AutoResearchRunDoc["evolutionResult"]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tOpt: any;
  onApply: (prompt: string) => void;
}) {
  const [showChampion, setShowChampion] = useState(false);
  const generations = result.generations as Record<string, unknown>[];
  const champion = result.champion as Record<string, unknown>;
  const championPrompt = (champion.config as Record<string, unknown>)?.systemPrompt as string | undefined;

  return (
    <FadeIn delay={0.2}>
      <div className="space-y-4">
        {/* Generation chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dna className="h-4 w-4 text-pink-500" />
              {tOpt.evolutionProgress}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {generations.map((gen, i) => {
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
              {tOpt.generationCount}: {result.totalGenerations}
            </p>
          </CardContent>
        </Card>

        {/* Champion */}
        {championPrompt && (
          <Card className="border-pink-500/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  <span className="font-semibold">{tOpt.champion}</span>
                  <span className="text-sm text-muted-foreground">{champion.mutationDescription as string}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowChampion(!showChampion)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" />
                    {showChampion ? "Hide" : "Preview"}
                  </Button>
                  <Button size="sm" onClick={() => onApply(championPrompt)} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {tOpt.applyPrompt}
                  </Button>
                </div>
              </div>
              {showChampion && (
                <ScrollArea className="h-64 rounded-lg border">
                  <pre className="whitespace-pre-wrap text-xs p-3 font-mono">{championPrompt}</pre>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </FadeIn>
  );
}
