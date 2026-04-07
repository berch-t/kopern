"use client";

import { useEffect, useRef, useState } from "react";
import { MonitorRadarChart } from "./MonitorRadarChart";
import { BaselineComparison } from "./BaselineComparison";
import { Button } from "@/components/ui/button";
import { Twitter, Link2, Download, AlertTriangle, Lightbulb, ChevronDown, ChevronRight, Plug } from "lucide-react";
import { toast } from "sonner";
import { useDictionary } from "@/providers/LocaleProvider";
import { useLocalizedRouter } from "@/hooks/useLocalizedRouter";
import { getAuth } from "firebase/auth";

interface CaseResult {
  caseName: string;
  passed: boolean;
  score: number;
  agentOutput: string;
  durationMs: number;
  criteriaResults: { type: string; passed: boolean; score: number; message?: string }[];
}

interface MonitorScoreCardProps {
  runId: string;
  score: number;
  model: string;
  provider: string;
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

/** Animated count-up from 0 to target */
function AnimatedScore({ value, className }: { value: number; className: string }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <span className={className}>{display}</span>;
}

/** Parse insight string into structured card data */
function parseInsight(insight: string): { severity: "critical" | "suggestion" | "info"; title: string; detail: string } {
  const critMatch = insight.match(/^\[CRITICAL\]\s*(.+?):\s*([\s\S]+)$/);
  if (critMatch) return { severity: "critical", title: critMatch[1], detail: critMatch[2] };
  const sugMatch = insight.match(/^\[SUGGESTION\]\s*(.+?):\s*([\s\S]+)$/);
  if (sugMatch) return { severity: "suggestion", title: sugMatch[1], detail: sugMatch[2] };
  return { severity: "info", title: "", detail: insight };
}

function InsightCard({ insight }: { insight: string }) {
  const parsed = parseInsight(insight);
  const [expanded, setExpanded] = useState(false);

  // Info = summary paragraph, no expand
  if (parsed.severity === "info") {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{parsed.detail}</p>
      </div>
    );
  }

  const isCritical = parsed.severity === "critical";
  const borderColor = isCritical ? "border-red-500/30" : "border-amber-500/30";
  const bgColor = isCritical ? "bg-red-500/5" : "bg-amber-500/5";
  const badgeColor = isCritical ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400";
  const Icon = isCritical ? AlertTriangle : Lightbulb;

  // Truncate detail for collapsed view
  const shortDetail = parsed.detail.length > 200 ? parsed.detail.slice(0, 200) + "..." : parsed.detail;

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-start gap-2 w-full p-3 text-left"
      >
        <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeColor}`}>
              {isCritical ? "Critical" : "Suggestion"}
            </span>
            <span className="text-xs font-medium truncate">{parsed.title}</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {expanded ? parsed.detail : shortDetail}
          </p>
        </div>
        {parsed.detail.length > 200 && (
          <span className="shrink-0 mt-0.5">
            {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          </span>
        )}
      </button>
    </div>
  );
}

export function MonitorScoreCard({
  runId,
  score,
  model,
  provider,
  testCount,
  avgLatencyMs,
  criteriaBreakdown,
  baselineComparison,
  insights,
  results,
}: MonitorScoreCardProps) {
  const t = useDictionary();
  const m = t.monitor;
  const router = useLocalizedRouter();
  const scorePercent = Math.round(score * 100);
  const scoreColor = scorePercent >= 80 ? "text-emerald-400" : scorePercent >= 50 ? "text-amber-400" : "text-red-400";
  const ringColor = scorePercent >= 80 ? "stroke-emerald-400" : scorePercent >= 50 ? "stroke-amber-400" : "stroke-red-400";
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/monitor/${runId}` : "";

  function copyLink() {
    navigator.clipboard.writeText(shareUrl);
    toast.success(m.linkCopied);
  }

  function shareTwitter() {
    const text = `My ${model} scored ${scorePercent}/100 on Kopern Workflow Monitor! ${shareUrl}`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  }

  async function setupMonitoring() {
    const user = getAuth().currentUser;
    if (!user) {
      router.push("/login?from=monitor");
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/monitor/setup-team", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success(m.teamCreated || "Monitor team created!");
        router.push("/dashboard");
      } else {
        toast.error(m.teamCreationFailed || "Failed to create team");
      }
    } catch {
      toast.error(m.teamCreationFailed || "Failed to create team");
    }
  }

  function downloadReport() {
    const report = {
      runId,
      provider,
      model,
      score: scorePercent,
      testCount,
      avgLatencyMs,
      criteriaBreakdown: criteriaBreakdown.map(cb => ({
        criterion: cb.criterion,
        label: cb.label,
        score: Math.round(cb.score * 100),
        passed: cb.passed,
      })),
      baselineComparison: baselineComparison ? {
        baselineScore: Math.round(baselineComparison.baselineScore * 100),
        delta: Math.round(baselineComparison.delta * 100),
        version: baselineComparison.baselineVersion,
        perCriterion: baselineComparison.perCriterion.map(pc => ({
          criterion: pc.criterion,
          yours: Math.round(pc.userScore * 100),
          baseline: Math.round(pc.baselineScore * 100),
          delta: Math.round(pc.delta * 100),
        })),
      } : null,
      insights,
      results: results?.map(r => ({
        caseName: r.caseName,
        passed: r.passed,
        score: Math.round(r.score * 100),
        durationMs: r.durationMs,
        agentOutput: r.agentOutput,
        criteria: r.criteriaResults.map(cr => ({
          type: cr.type,
          score: Math.round(cr.score * 100),
          passed: cr.passed,
          message: cr.message,
        })),
      })),
      generatedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kopern-monitor-${model}-${runId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // SVG ring animation
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (circumference * scorePercent) / 100;

  return (
    <div className="rounded-xl border border-primary/20 bg-gradient-to-b from-primary/5 to-transparent p-6 space-y-6">
      {/* Score header with animated ring */}
      <div className="flex flex-col items-center">
        <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">{m.healthScore}</div>
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              className={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <AnimatedScore value={scorePercent} className={`text-5xl font-bold ${scoreColor}`} />
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-3">
          {model} ({provider})
        </div>
        <div className="flex justify-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{testCount} {m.tests}</span>
          <span>{avgLatencyMs}ms {m.avgLatency}</span>
        </div>
      </div>

      {/* Radar chart */}
      <MonitorRadarChart
        breakdown={criteriaBreakdown}
        baselineBreakdown={baselineComparison?.perCriterion}
      />

      {/* Criteria breakdown — compact bars */}
      <div className="space-y-2">
        {criteriaBreakdown.map((cb) => {
          const pct = Math.round(cb.score * 100);
          const barColor = cb.passed ? "bg-emerald-500" : "bg-red-500";
          return (
            <div key={cb.criterion} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{cb.label}</span>
                <span className={cb.passed ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                  {pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-700`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Baseline comparison */}
      {baselineComparison && (
        <BaselineComparison comparison={baselineComparison} />
      )}

      {/* Insights — parsed cards */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{m.insights}</h4>
          {insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      )}

      {/* Connected monitoring CTA */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-2">
        <p className="text-sm font-semibold text-accent">{m.connectedCta}</p>
        <p className="text-xs text-muted-foreground">{m.connectedDescription}</p>
        <p className="text-[10px] text-muted-foreground/70 italic">{m.mcpHint}</p>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={copyLink}>
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          {m.copyLink}
        </Button>
        <Button variant="outline" size="sm" onClick={shareTwitter}>
          <Twitter className="h-3.5 w-3.5 mr-1.5" />
          {m.shareX}
        </Button>
        <Button variant="outline" size="sm" onClick={downloadReport}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {m.downloadReport || "Download"}
        </Button>
        <Button size="sm" onClick={setupMonitoring} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plug className="h-3.5 w-3.5 mr-1.5" />
          {m.signUpCta}
        </Button>
      </div>
    </div>
  );
}
