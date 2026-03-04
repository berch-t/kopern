"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CaseProgress {
  caseName: string;
  status: "pending" | "running" | "passed" | "failed";
  score?: number;
}

interface RunProgressProps {
  cases: CaseProgress[];
  totalCases: number;
}

export function RunProgress({ cases, totalCases }: RunProgressProps) {
  const completed = cases.filter((c) => c.status === "passed" || c.status === "failed").length;
  const progress = totalCases > 0 ? completed / totalCases : 0;

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span>
            {completed} / {totalCases} cases
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Case list */}
      <div className="space-y-2">
        {cases.map((c, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <div className="flex items-center gap-2">
              {c.status === "running" && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {c.status === "passed" && (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              )}
              {c.status === "failed" && (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
              {c.status === "pending" && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span>{c.caseName}</span>
            </div>
            {c.score !== undefined && (
              <span
                className={cn(
                  "font-mono text-xs",
                  c.status === "passed" ? "text-emerald-500" : "text-destructive"
                )}
              >
                {Math.round(c.score * 100)}%
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
