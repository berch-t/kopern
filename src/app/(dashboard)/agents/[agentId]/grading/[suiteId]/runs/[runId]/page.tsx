"use client";

import { use } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDocument } from "@/hooks/useFirestore";
import { gradingRunDoc, type GradingRunDoc } from "@/lib/firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlideUp } from "@/components/motion/SlideUp";
import { ScoreBadge } from "@/components/grading/ScoreBadge";

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
