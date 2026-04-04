"use client";

import { GraderRadarChart } from "./RadarChart";
import { Button } from "@/components/ui/button";
import { Copy, Lock } from "lucide-react";
import { toast } from "sonner";
import { useDictionary } from "@/providers/LocaleProvider";

interface CriterionBreakdown {
  criterion: string;
  label: string;
  score: number;
  passed: boolean;
}

interface ScoreCardProps {
  runId: string;
  score: number; // 0-1
  totalCases: number;
  passedCases: number;
  criteriaBreakdown: CriterionBreakdown[];
  locale: string;
  mode?: "endpoint" | "prompt";
  latencyStats?: { avg: number; min: number; max: number; p95: number };
}

export function ScoreCard({ runId, score, totalCases, passedCases, criteriaBreakdown, locale, mode = "prompt", latencyStats }: ScoreCardProps) {
  const t = useDictionary();
  const g = t.grader;

  const premiumCriteria = [
    { label: g.premiumLatency },
    { label: g.premiumConsistency },
    { label: g.premiumToolAudit },
    { label: g.premiumCompliance },
  ];

  const scorePercent = Math.round(score * 100);
  const scoreColor = scorePercent >= 80 ? "text-emerald-400" : scorePercent >= 50 ? "text-amber-400" : "text-red-400";

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/${locale}/grader?run=${runId}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success(g.linkCopied);
  };

  const shareTwitter = () => {
    const text = encodeURIComponent(`My AI agent scores ${scorePercent}/100 on Kopern Grader! ${shareUrl}`);
    window.open(`https://x.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareLinkedIn = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-6">
      {/* Score header */}
      <div className="text-center">
        <div className={`text-6xl font-bold ${scoreColor}`}>
          {scorePercent}
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          {passedCases}/{totalCases} {g.testsPassed}
        </div>
        {latencyStats && (
          <div className="text-xs text-muted-foreground mt-1">
            {g.avgLatency}: {latencyStats.avg}ms | P95: {latencyStats.p95}ms
          </div>
        )}
      </div>

      {/* Radar chart */}
      <GraderRadarChart data={criteriaBreakdown} size={280} />

      {/* Criteria breakdown */}
      <div className="space-y-2">
        {criteriaBreakdown.map((c) => (
          <div key={c.criterion} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{c.label}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.round(c.score * 100)}%` }}
                />
              </div>
              <span className={c.passed ? "text-emerald-400" : "text-red-400"}>
                {Math.round(c.score * 100)}%
              </span>
            </div>
          </div>
        ))}

        {/* Premium locked criteria */}
        {premiumCriteria.map((c) => (
          <div key={c.label} className="flex items-center justify-between text-sm opacity-50">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              {c.label}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-muted-foreground/20 w-0" />
              </div>
              <span className="text-muted-foreground text-xs">Pro</span>
            </div>
          </div>
        ))}
      </div>

      {/* Share */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={copyLink} className="flex-1">
          <Copy className="h-3.5 w-3.5 mr-1.5" />
          {g.copyLink}
        </Button>
        <Button variant="outline" size="sm" onClick={shareTwitter} title="Share on X / Twitter">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </Button>
        <Button variant="outline" size="sm" onClick={shareLinkedIn} title="Share on LinkedIn">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
        </Button>
      </div>

      {/* CTA */}
      <div className="border-t border-border pt-4 space-y-2">
        {mode === "endpoint" ? (
          <>
            <p className="text-xs text-muted-foreground text-center">
              {g.ctaAutofixTitle}
            </p>
            <a
              href={`/${locale}/signup`}
              className="block w-full text-center py-2.5 rounded-lg bg-primary hover:bg-primary/85 text-primary-foreground text-sm font-medium transition-colors"
            >
              {g.ctaAutofix}
            </a>
            <a
              href={`/${locale}/signup`}
              className="block w-full text-center py-2 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-primary text-xs transition-colors"
            >
              {g.ctaUnlockCriteria}
            </a>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground text-center">
              {g.ctaPromptTitle}
            </p>
            <a
              href={`/${locale}/signup`}
              className="block w-full text-center py-2.5 rounded-lg bg-primary hover:bg-primary/85 text-primary-foreground text-sm font-medium transition-colors"
            >
              {g.ctaPrompt}
            </a>
          </>
        )}
      </div>
    </div>
  );
}
