"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { McpUsageDoc } from "@/lib/firebase/firestore";

interface UsageStatsProps {
  usage: (McpUsageDoc & { yearMonth: string })[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function UsageStats({ usage }: UsageStatsProps) {
  // Sort by yearMonth descending, take current month
  const sorted = [...usage].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
  const current = sorted[0];

  if (!current) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" />
            Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No usage data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Usage — {current.yearMonth}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 grid-cols-1 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Requests</p>
          <p className="text-2xl font-bold">{formatNumber(current.requestCount)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" /> Input Tokens
          </p>
          <p className="text-2xl font-bold">{formatNumber(current.inputTokens)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <ArrowDownRight className="h-3 w-3" /> Output Tokens
          </p>
          <p className="text-2xl font-bold">{formatNumber(current.outputTokens)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
