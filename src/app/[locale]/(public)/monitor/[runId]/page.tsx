"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MonitorScoreCard } from "@/components/monitor/MonitorScoreCard";
import { DiagnosticDetail } from "@/components/monitor/DiagnosticDetail";
import { SlideUp } from "@/components/motion/SlideUp";
import { FadeIn } from "@/components/motion/FadeIn";
import { Loader2, Activity } from "lucide-react";
import { LocalizedLink } from "@/components/LocalizedLink";
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

interface MonitorRun {
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
  results?: CaseResult[];
}

export default function MonitorRunPage() {
  const t = useDictionary();
  const m = t.monitor;
  const params = useParams();
  const runId = params.runId as string;
  const [run, setRun] = useState<MonitorRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runId) return;
    fetch(`/api/monitor/${runId}`)
      .then(res => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(data => setRun(data))
      .catch(() => setError(m.runNotFound || "Run not found"))
      .finally(() => setLoading(false));
  }, [runId, m]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-gradient-to-b from-accent/5 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <SlideUp>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-1.5 text-sm text-accent mb-4">
              <Activity className="h-3.5 w-3.5" />
              {m.badge}
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              {m.reportTitle || "Diagnostic Report"}
            </h1>
          </SlideUp>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        )}

        {error && (
          <FadeIn>
            <div className="text-center py-20 space-y-4">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">{error}</p>
              <LocalizedLink href="/monitor" className="text-accent hover:underline text-sm">
                {m.runNewDiagnostic || "Run a new diagnostic"}
              </LocalizedLink>
            </div>
          </FadeIn>
        )}

        {run && (
          <FadeIn>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3">
                <MonitorScoreCard
                  runId={run.runId}
                  score={run.score}
                  model={run.model}
                  provider={run.provider}
                  testCount={run.testCount}
                  avgLatencyMs={run.avgLatencyMs}
                  criteriaBreakdown={run.criteriaBreakdown}
                  baselineComparison={run.baselineComparison}
                  insights={run.insights}
                  results={run.results}
                />
              </div>
              <div className="lg:col-span-2">
                {run.results && run.results.length > 0 && (
                  <DiagnosticDetail results={run.results} />
                )}
                {(!run.results || run.results.length === 0) && (
                  <div className="rounded-xl border border-dashed border-border/50 p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      {m.detailedResultsNotAvailable || "Detailed test results are not available for shared reports."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </div>
  );
}
