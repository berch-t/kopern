"use client";

import { use, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCollection } from "@/hooks/useFirestore";
import {
  gradingRunsCollection,
  gradingCasesCollection,
  type GradingRunDoc,
  type GradingCaseDoc,
} from "@/lib/firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { RunProgress } from "@/components/grading/RunProgress";
import { ResultsTable } from "@/components/grading/ResultsTable";
import { ScoreBadge } from "@/components/grading/ScoreBadge";
import { TrendChart } from "@/components/grading/TrendChart";
import { useSSE } from "@/hooks/useSSE";
import { LocalizedLink } from "@/components/LocalizedLink";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

interface CaseProgress {
  caseName: string;
  status: "pending" | "running" | "passed" | "failed";
  score?: number;
}

interface CaseResultData {
  caseName: string;
  passed: boolean;
  score: number;
  agentOutput: string;
  criteriaResults: {
    criterionId: string;
    criterionType: string;
    passed: boolean;
    score: number;
    message: string;
  }[];
  durationMs: number;
}

export default function RunsPage({
  params,
}: {
  params: Promise<{ agentId: string; suiteId: string }>;
}) {
  const { agentId, suiteId } = use(params);
  const { user } = useAuth();
  const t = useDictionary();
  const locale = useLocale();
  const { data: runs } = useCollection<GradingRunDoc>(
    user ? gradingRunsCollection(user.uid, agentId, suiteId) : null,
    "createdAt"
  );
  const { data: cases } = useCollection<GradingCaseDoc>(
    user ? gradingCasesCollection(user.uid, agentId, suiteId) : null,
    "orderIndex",
    "asc"
  );

  const [isRunning, setIsRunning] = useState(false);
  const [caseProgress, setCaseProgress] = useState<CaseProgress[]>([]);
  const [results, setResults] = useState<CaseResultData[]>([]);
  const [overallScore, setOverallScore] = useState<number | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [improvementAnalyzing, setImprovementAnalyzing] = useState(false);
  const [improvementNotes, setImprovementNotes] = useState<{ summary: string; notes: { category: string; severity: string; title: string; detail: string }[] } | null>(null);

  const { start } = useSSE({
    onMessage: (msg) => {
      switch (msg.event) {
        case "case_start": {
          const data = msg.data as { caseIndex: number; caseName: string; totalCases: number };
          setCaseProgress((prev) => {
            const updated = [...prev];
            updated[data.caseIndex] = { caseName: data.caseName, status: "running" };
            return updated;
          });
          break;
        }
        case "case_end": {
          const data = msg.data as {
            caseIndex: number;
            caseName: string;
            passed: boolean;
            score: number;
            criteriaResults: CaseResultData["criteriaResults"];
            agentOutput: string;
          };
          setCaseProgress((prev) => {
            const updated = [...prev];
            updated[data.caseIndex] = {
              caseName: data.caseName,
              status: data.passed ? "passed" : "failed",
              score: data.score,
            };
            return updated;
          });
          setResults((prev) => [
            ...prev,
            {
              caseName: data.caseName,
              passed: data.passed,
              score: data.score,
              agentOutput: data.agentOutput,
              criteriaResults: data.criteriaResults,
              durationMs: 0,
            },
          ]);
          break;
        }
        case "done":
          setIsRunning(false);
          break;
        case "improvement_status":
          setImprovementAnalyzing(true);
          break;
        case "improvement_notes": {
          const notesData = msg.data as { summary: string; notes: { category: string; severity: string; title: string; detail: string }[] };
          setImprovementNotes(notesData);
          setImprovementAnalyzing(false);
          break;
        }
      }
    },
    onComplete: () => setIsRunning(false),
    onError: (error) => {
      setIsRunning(false);
      const msg = error.message;
      if (msg.includes("limit reached") || msg.includes("not available")) {
        setPlanError(msg);
      } else {
        toast.error(msg || "Grading run failed");
      }
    },
  });

  function handleRunGrading() {
    if (cases.length === 0) return;
    setIsRunning(true);
    setResults([]);
    setOverallScore(null);
    setPlanError(null);
    setImprovementNotes(null);
    setImprovementAnalyzing(false);
    setCaseProgress(
      cases.map((c) => ({ caseName: c.name, status: "pending" as const }))
    );

    start(`/api/agents/${agentId}/grading/${suiteId}/run`, {
      userId: user!.uid,
      locale,
      cases: cases.map((c) => ({
        id: c.id,
        name: c.name,
        inputPrompt: c.inputPrompt,
        expectedBehavior: c.expectedBehavior,
        criteria: c.criteria,
      })),
    });
  }

  // Compute score from results
  const computedScore =
    results.length > 0
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length
      : null;

  // Trend data from past runs
  const trendData = runs
    .filter((r) => r.score !== null)
    .reverse()
    .map((r, i) => ({
      label: `v${r.agentVersion}`,
      score: r.score!,
    }));

  return (
    <div className="space-y-6">
      <SlideUp>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Grading Runs</h1>
          <Button onClick={handleRunGrading} disabled={isRunning || cases.length === 0}>
            <Play className="mr-2 h-4 w-4" />
            {isRunning ? "Running..." : "Run Grading"}
          </Button>
        </div>
      </SlideUp>

      {/* Plan limit banner */}
      {planError && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t.planLimit.title}</p>
              <p className="text-xs text-muted-foreground">
                {t.planLimit.description}
              </p>
            </div>
            <LocalizedLink href="/pricing">
              <Button size="sm">{t.planLimit.viewPlans}</Button>
            </LocalizedLink>
          </CardContent>
        </Card>
      )}

      {/* Trend Chart */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart data={trendData} />
          </CardContent>
        </Card>
      )}

      {/* Active run progress */}
      {isRunning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Running...</CardTitle>
          </CardHeader>
          <CardContent>
            <RunProgress cases={caseProgress} totalCases={cases.length} />
          </CardContent>
        </Card>
      )}

      {/* Results from current run */}
      {!isRunning && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Latest Results</CardTitle>
          </CardHeader>
          <CardContent>
            <ResultsTable results={results} overallScore={computedScore ?? 0} />
          </CardContent>
        </Card>
      )}

      {/* Improvement Notes */}
      {improvementAnalyzing && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-muted-foreground">Analyzing results and generating improvement suggestions...</span>
          </CardContent>
        </Card>
      )}
      {improvementNotes && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Improvement Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground prose prose-sm dark:prose-invert max-w-none">
              <MarkdownRenderer content={improvementNotes.summary} />
            </div>
            {improvementNotes.notes.length > 0 && (
              <div className="space-y-3">
                {improvementNotes.notes.map((note, i) => (
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
            )}
          </CardContent>
        </Card>
      )}

      {/* Past runs */}
      {runs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Past Runs</h2>
          {runs.map((run) => (
            <LocalizedLink key={run.id} href={`/agents/${agentId}/grading/${suiteId}/runs/${run.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
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
                    <span className="text-sm">
                      v{run.agentVersion} — {run.passedCases}/{run.totalCases} passed
                    </span>
                  </div>
                  {run.score !== null && <ScoreBadge score={run.score} size="sm" />}
                </CardContent>
              </Card>
            </LocalizedLink>
          ))}
        </div>
      )}
    </div>
  );
}
