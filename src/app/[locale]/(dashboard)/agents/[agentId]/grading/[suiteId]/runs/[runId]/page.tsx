"use client";

import { use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument, useCollection } from "@/hooks/useFirestore";
import {
  gradingRunDoc,
  runResultsCollection,
  type GradingRunDoc,
  type RunResultDoc,
} from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlideUp } from "@/components/motion/SlideUp";
import { ScoreBadge } from "@/components/grading/ScoreBadge";
import { CheckCircle2, XCircle, ChevronDown, Lightbulb, Wrench, Zap, Shield, Trophy, ArrowRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ImprovementNote } from "@/lib/firebase/firestore";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { LocalizedLink } from "@/components/LocalizedLink";
import { useDictionary } from "@/providers/LocaleProvider";

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; suiteId: string; runId: string }>;
}) {
  const { agentId, suiteId, runId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const { data: run, loading } = useDocument<GradingRunDoc>(
    user ? gradingRunDoc(user.uid, agentId, suiteId, runId) : null
  );
  const { data: results } = useCollection<RunResultDoc>(
    user ? runResultsCollection(user.uid, agentId, suiteId, runId) : null,
    "createdAt",
    "asc"
  );

  if (loading) {
    return <div className="animate-pulse text-muted-foreground">Loading run...</div>;
  }

  if (!run) {
    return <div className="text-destructive">Run not found</div>;
  }

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Run Detail</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant={
                  run.status === "completed"
                    ? "default"
                    : run.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {run.status}
              </Badge>
              <span className="text-sm text-muted-foreground">v{run.agentVersion}</span>
            </div>
          </div>
          {run.score !== null && <ScoreBadge score={run.score} size="lg" />}
        </div>
      </SlideUp>

      <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{run.totalCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-500">{run.passedCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-destructive">
              {run.totalCases - run.passedCases}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((result) => (
              <ResultRow key={result.id} result={result} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Improvement Notes */}
      {run.improvementNotes && run.improvementNotes.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Improvement Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {run.improvementSummary && (
              <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={run.improvementSummary} />
              </div>
            )}
            <div className="space-y-3">
              {run.improvementNotes.map((note: ImprovementNote, i: number) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg border p-3",
                    note.severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-border"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={note.severity === "critical" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {note.severity}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {note.category === "system_prompt" ? "System Prompt" : note.category === "skill" ? "Skill" : note.category === "tool" ? "Tool" : "General"}
                    </Badge>
                    <span className="text-sm font-medium">{note.title}</span>
                  </div>
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                    <MarkdownRenderer content={note.detail} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps CTA */}
      {run.status === "completed" && (
        <NextStepsCTA
          score={run.score}
          failedCount={run.totalCases - run.passedCases}
          agentId={agentId}
          suiteId={suiteId}
          runId={runId}
          t={t}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Agent Version</span>
            <span>{run.agentVersion}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{run.status}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Score</span>
            <span>{run.score !== null ? `${Math.round(run.score * 100)}%` : "N/A"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NextStepsCTA({
  score,
  failedCount,
  agentId,
  suiteId,
  runId,
  t,
}: {
  score: number | null;
  failedCount: number;
  agentId: string;
  suiteId: string;
  runId: string;
  t: ReturnType<typeof useDictionary>;
}) {
  const ns = t.grading.nextSteps;
  const isPerfect = failedCount === 0 && score !== null && score >= 0.95;
  const hasFailures = failedCount > 0;
  const isLowScore = score !== null && score < 0.8;

  return (
    <Card className={cn(
      "border-2",
      isPerfect ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-primary/5"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRight className="h-4 w-4" />
          {ns.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPerfect && (
          <div className="space-y-2">
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              {ns.perfectScore}
            </p>
            <p className="text-xs text-muted-foreground">{ns.perfectScoreOptimize}</p>
          </div>
        )}
        {hasFailures && (
          <p className="text-sm">
            {ns.failuresDetected.replace("{count}", String(failedCount))}
          </p>
        )}
        {!hasFailures && isLowScore && (
          <p className="text-sm">{ns.lowScore}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {hasFailures && (
            <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suiteId}&mode=autofix&run=${runId}`}>
              <Button size="sm" variant="default">
                <Wrench className="mr-1.5 h-3.5 w-3.5" />
                {ns.autofixCta}
              </Button>
            </LocalizedLink>
          )}
          {(isLowScore || !isPerfect) && (
            <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suiteId}&mode=autotune`}>
              <Button size="sm" variant={hasFailures ? "outline" : "default"}>
                <Zap className="mr-1.5 h-3.5 w-3.5" />
                {ns.autotuneCta}
              </Button>
            </LocalizedLink>
          )}
          {isPerfect && (
            <>
              <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suiteId}&mode=stress_lab`}>
                <Button size="sm" variant="outline">
                  <Shield className="mr-1.5 h-3.5 w-3.5" />
                  {ns.stressLabCta}
                </Button>
              </LocalizedLink>
              <LocalizedLink href={`/agents/${agentId}/optimize?suite=${suiteId}&mode=tournament`}>
                <Button size="sm" variant="outline">
                  <Trophy className="mr-1.5 h-3.5 w-3.5" />
                  {ns.tournamentCta}
                </Button>
              </LocalizedLink>
            </>
          )}
          <LocalizedLink href={`/agents/${agentId}/optimize`}>
            <Button size="sm" variant="ghost">
              {ns.viewOptimizeLab}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </LocalizedLink>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultRow({ result }: { result: RunResultDoc & { id: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn(
      "rounded-lg border",
      !result.passed && "border-destructive/20"
    )}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {result.passed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <XCircle className="h-4 w-4 text-destructive" />
          )}
          <span className="text-sm font-medium">{result.caseId}</span>
          <Badge variant="outline" className="text-xs">
            {Math.round(result.score * 100)}%
          </Badge>
          {result.durationMs > 0 && (
            <span className="text-xs text-muted-foreground">
              {(result.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="border-t p-3 space-y-3">
          {/* Agent output */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Agent Output</p>
            <pre className="whitespace-pre-wrap text-xs bg-muted/50 rounded p-2 max-h-[200px] overflow-y-auto">
              {result.agentOutput || "No output"}
            </pre>
          </div>

          {/* Criteria results — expanded with full judge feedback */}
          {result.criteriaResults?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Criteria</p>
              <div className="space-y-2">
                {result.criteriaResults.map((cr, i) => (
                  <div key={i} className={cn(
                    "rounded-md border p-2",
                    cr.passed ? "border-emerald-500/20 bg-emerald-500/5" : "border-destructive/20 bg-destructive/5"
                  )}>
                    <div className="flex items-center gap-2 text-xs">
                      {cr.passed ? (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3 w-3 text-destructive shrink-0" />
                      )}
                      <Badge variant="outline" className="text-[10px]">{cr.criterionType}</Badge>
                      <span className="text-muted-foreground">{Math.round(cr.score * 100)}%</span>
                    </div>
                    {cr.message && (
                      <div className="mt-1.5 text-xs text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
                        <MarkdownRenderer content={cr.message} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool calls */}
          {result.toolCalls?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Tool Calls ({result.toolCalls.length})
              </p>
              <div className="flex gap-1 flex-wrap">
                {result.toolCalls.map((tc, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tc.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
