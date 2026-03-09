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
import { Play } from "lucide-react";
import { SlideUp } from "@/components/motion/SlideUp";
import { RunProgress } from "@/components/grading/RunProgress";
import { ResultsTable } from "@/components/grading/ResultsTable";
import { ScoreBadge } from "@/components/grading/ScoreBadge";
import { TrendChart } from "@/components/grading/TrendChart";
import { useSSE } from "@/hooks/useSSE";
import { LocalizedLink } from "@/components/LocalizedLink";

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
      }
    },
    onComplete: () => setIsRunning(false),
    onError: () => setIsRunning(false),
  });

  function handleRunGrading() {
    if (cases.length === 0) return;
    setIsRunning(true);
    setResults([]);
    setOverallScore(null);
    setCaseProgress(
      cases.map((c) => ({ caseName: c.name, status: "pending" as const }))
    );

    start(`/api/agents/${agentId}/grading/${suiteId}/run`, {
      userId: user!.uid,
      cases: cases.map((c) => ({
        id: c.id,
        name: c.name,
        inputPrompt: c.inputPrompt,
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
