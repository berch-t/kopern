"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/motion/AnimatedCounter";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  Wrench,
  Cpu,
} from "lucide-react";

interface LiveMetricsProps {
  tokensIn: number;
  tokensOut: number;
  estimatedCost: number;
  toolCallCount: number;
  contextUsedPercent: number;
}

function MetricRow({
  icon: Icon,
  label,
  children,
  iconColor,
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  children: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium tabular-nums">{children}</div>
    </div>
  );
}

export function LiveMetrics({
  tokensIn,
  tokensOut,
  estimatedCost,
  toolCallCount,
  contextUsedPercent,
}: LiveMetricsProps) {
  const clampedPercent = Math.min(Math.max(contextUsedPercent, 0), 100);
  const contextColor =
    clampedPercent > 85
      ? "bg-red-500"
      : clampedPercent > 60
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Session Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-1">
        <MetricRow icon={ArrowDownToLine} label="Tokens In" iconColor="text-blue-500">
          <AnimatedCounter value={tokensIn} />
        </MetricRow>

        <MetricRow icon={ArrowUpFromLine} label="Tokens Out" iconColor="text-emerald-500">
          <AnimatedCounter value={tokensOut} />
        </MetricRow>

        <Separator className="my-1" />

        <MetricRow icon={DollarSign} label="Est. Cost" iconColor="text-amber-500">
          <AnimatedCounter value={estimatedCost} decimals={4} suffix="$" />
        </MetricRow>

        <MetricRow icon={Wrench} label="Tool Calls" iconColor="text-purple-500">
          <AnimatedCounter value={toolCallCount} />
        </MetricRow>

        <Separator className="my-1" />

        {/* Context usage progress bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Context</span>
            </div>
            <span className="text-sm font-medium tabular-nums">
              <AnimatedCounter value={Math.round(clampedPercent)} suffix="%" />
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${contextColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${clampedPercent}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
