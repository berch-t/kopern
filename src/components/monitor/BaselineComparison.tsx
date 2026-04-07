"use client";

import { useDictionary } from "@/providers/LocaleProvider";

interface BaselineComparisonProps {
  comparison: {
    baselineScore: number;
    delta: number;
    baselineVersion: string;
    perCriterion: { criterion: string; userScore: number; baselineScore: number; delta: number }[];
  };
}

export function BaselineComparison({ comparison }: BaselineComparisonProps) {
  const t = useDictionary();
  const m = t.monitor;
  const deltaPercent = Math.round(comparison.delta * 100);
  const deltaColor = deltaPercent >= 0 ? "text-emerald-400" : "text-red-400";
  const deltaSign = deltaPercent >= 0 ? "+" : "";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{m.baselineComparison}</h4>
        <span className="text-xs text-muted-foreground">{comparison.baselineVersion}</span>
      </div>

      {/* Overall */}
      <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
        <span className="text-sm">{m.overallDelta}</span>
        <span className={`text-sm font-bold ${deltaColor}`}>
          {deltaSign}{deltaPercent}%
        </span>
      </div>

      {/* Per criterion bars */}
      <div className="space-y-2">
        {comparison.perCriterion.map((pc) => {
          const userPct = Math.round(pc.userScore * 100);
          const basePct = Math.round(pc.baselineScore * 100);
          const delta = Math.round(pc.delta * 100);
          const color = delta >= 0 ? "text-emerald-400" : "text-red-400";

          return (
            <div key={pc.criterion} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground capitalize">{pc.criterion.replace(/_/g, " ")}</span>
                <span className={color}>
                  {delta >= 0 ? "+" : ""}{delta}%
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                {/* Baseline marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-muted-foreground/40 z-10"
                  style={{ left: `${basePct}%` }}
                />
                {/* User score bar */}
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    delta >= 0 ? "bg-emerald-500" : "bg-red-500"
                  }`}
                  style={{ width: `${userPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/70">
                <span>{m.yours}: {userPct}%</span>
                <span>{m.baseline}: {basePct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
