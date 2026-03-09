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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlideUp } from "@/components/motion/SlideUp";
import { ScoreBadge } from "@/components/grading/ScoreBadge";
import { CheckCircle2, XCircle, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function RunDetailPage({
  params,
}: {
  params: Promise<{ agentId: string; suiteId: string; runId: string }>;
}) {
  const { agentId, suiteId, runId } = use(params);
  const { user } = useAuth();
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

      <div className="grid gap-4 sm:grid-cols-3">
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

function ResultRow({ result }: { result: RunResultDoc & { id: string } }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border">
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

          {/* Criteria results */}
          {result.criteriaResults?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Criteria</p>
              <div className="space-y-1">
                {result.criteriaResults.map((cr, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {cr.passed ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive shrink-0" />
                    )}
                    <span className="text-muted-foreground">{cr.criterionType}</span>
                    <span className="truncate">{cr.message}</span>
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
