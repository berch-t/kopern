"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock, CheckCircle2, XCircle } from "lucide-react";
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

interface DiagnosticDetailProps {
  results: CaseResult[];
}

/** Extract category prefix from case name like "[REASONING] R1" */
function getCaseCategory(name: string): string {
  const match = name.match(/^\[([A-Z_\s]+)\]/);
  return match ? match[1].trim() : "";
}

function CaseRow({ result, isOpen, onToggle }: { result: CaseResult; isOpen: boolean; onToggle: () => void }) {
  const t = useDictionary();
  const m = t.monitor;
  const [showFullOutput, setShowFullOutput] = useState(false);
  const pct = Math.round(result.score * 100);
  const StatusIcon = result.passed ? CheckCircle2 : XCircle;
  const statusColor = result.passed ? "text-emerald-400" : "text-red-400";

  // Truncate output preview
  const maxPreview = 300;
  const outputPreview = result.agentOutput.length > maxPreview && !showFullOutput
    ? result.agentOutput.slice(0, maxPreview) + "..."
    : result.agentOutput;

  return (
    <div className={`rounded-lg border text-sm ${
      result.passed ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
    }`}>
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${statusColor}`} />
          <span className="font-medium truncate">{result.caseName}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {result.durationMs > 1000 ? `${(result.durationMs / 1000).toFixed(1)}s` : `${result.durationMs}ms`}
          </span>
          <span className={`font-medium min-w-[3ch] text-right ${statusColor}`}>
            {pct}%
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/20 pt-3">
          {/* Criteria badges - horizontal compact */}
          {result.criteriaResults.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {result.criteriaResults.map((cr, j) => (
                <span
                  key={j}
                  className={`inline-flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 ${
                    cr.passed
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/15 text-red-400 border border-red-500/20"
                  }`}
                >
                  {cr.type.replace(/_/g, " ")}
                  <span className="font-medium">{Math.round(cr.score * 100)}%</span>
                </span>
              ))}
            </div>
          )}

          {/* Response - collapsed by default */}
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{m.response}</p>
            <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 max-h-48 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans">{outputPreview}</pre>
              {result.agentOutput.length > maxPreview && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowFullOutput(!showFullOutput); }}
                  className="text-accent text-[10px] mt-1 hover:underline"
                >
                  {showFullOutput ? (m.showLess || "Show less") : (m.showMore || "Show more")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DiagnosticDetail({ results }: DiagnosticDetailProps) {
  const t = useDictionary();
  const m = t.monitor;
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  function toggle(idx: number) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  // Group by category
  const categories = new Map<string, { results: CaseResult[]; indices: number[] }>();
  results.forEach((r, i) => {
    const cat = getCaseCategory(r.caseName) || "Other";
    if (!categories.has(cat)) categories.set(cat, { results: [], indices: [] });
    categories.get(cat)!.results.push(r);
    categories.get(cat)!.indices.push(i);
  });

  const passCount = results.filter(r => r.passed).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          {m.detailedResults}
        </h3>
        <span className="text-xs text-muted-foreground">
          {passCount}/{results.length} {m.passed || "passed"}
        </span>
      </div>

      {Array.from(categories.entries()).map(([category, { results: catResults, indices }]) => {
        const catPassed = catResults.filter(r => r.passed).length;
        const catAvgScore = Math.round(catResults.reduce((s, r) => s + r.score, 0) / catResults.length * 100);

        return (
          <div key={category} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-medium text-muted-foreground">{category}</span>
              <span className={`font-medium ${catAvgScore >= 70 ? "text-emerald-400" : catAvgScore >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {catPassed}/{catResults.length} &middot; {catAvgScore}%
              </span>
            </div>
            {catResults.map((r, j) => (
              <CaseRow
                key={indices[j]}
                result={r}
                isOpen={expanded.has(indices[j])}
                onToggle={() => toggle(indices[j])}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
