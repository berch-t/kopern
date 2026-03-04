"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScoreBadge } from "./ScoreBadge";

interface CaseResultItem {
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

interface ResultsTableProps {
  results: CaseResultItem[];
  overallScore: number;
}

export function ResultsTable({ results, overallScore }: ResultsTableProps) {
  const [expandedCase, setExpandedCase] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ScoreBadge score={overallScore} size="lg" />
        <div>
          <p className="text-lg font-bold">Overall Score</p>
          <p className="text-sm text-muted-foreground">
            {results.filter((r) => r.passed).length} / {results.length} cases passed
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {results.map((result, i) => (
          <Card key={i}>
            <button
              className="w-full text-left"
              onClick={() => setExpandedCase(expandedCase === i ? null : i)}
            >
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  {expandedCase === i ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  {result.passed ? (
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <CardTitle className="text-sm">{result.caseName}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {result.durationMs}ms
                  </span>
                  <ScoreBadge score={result.score} size="sm" />
                </div>
              </CardHeader>
            </button>

            <AnimatePresence>
              {expandedCase === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <CardContent className="space-y-3 border-t pt-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Agent Output</p>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">
                        {result.agentOutput}
                      </pre>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Criteria Results</p>
                      <div className="mt-1 space-y-1">
                        {result.criteriaResults.map((cr, j) => (
                          <div
                            key={j}
                            className="flex items-center justify-between rounded border px-2 py-1 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              {cr.passed ? (
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3 w-3 text-destructive" />
                              )}
                              <Badge variant="outline" className="text-[10px]">
                                {cr.criterionType}
                              </Badge>
                              <span>{cr.message}</span>
                            </div>
                            <span className="font-mono">
                              {Math.round(cr.score * 100)}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>
    </div>
  );
}
