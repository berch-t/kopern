"use client";

import { useState } from "react";
import { motion } from "framer-motion";

interface UsageBarChartProps {
  data: { yearMonth: string; totalCost: number; inputTokens: number; outputTokens: number }[];
}

function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function UsageBarChart({ data }: UsageBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const maxCost = Math.max(...data.map((d) => d.totalCost), 0.01);
  // Pad to at least 6 slots for visual consistency
  const reversed = [...data].reverse();
  const padded = [
    ...reversed,
    ...Array.from({ length: Math.max(0, 6 - reversed.length) }, (_, i) => ({
      yearMonth: "",
      totalCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      _placeholder: true as const,
      _key: `empty-${i}`,
    })),
  ];

  return (
    <div className="relative">
      <div className="flex items-end gap-2" style={{ height: 180 }}>
        {padded.map((d, i) => {
          const isPlaceholder = "_placeholder" in d;
          const heightPercent = isPlaceholder ? 0 : (d.totalCost / maxCost) * 100;
          const key = "_key" in d ? (d._key as string) : d.yearMonth;

          return (
            <div
              key={key}
              className="relative flex flex-1 flex-col items-center justify-end"
              style={{ height: "100%" }}
              onMouseEnter={() => !isPlaceholder && setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Tooltip */}
              {hoveredIndex === i && !isPlaceholder && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute -top-16 z-10 rounded-md border bg-popover px-3 py-2 text-xs shadow-md whitespace-nowrap"
                >
                  <p className="font-semibold">${d.totalCost.toFixed(4)}</p>
                  <p className="text-muted-foreground">
                    In: {formatTokens(d.inputTokens)} / Out: {formatTokens(d.outputTokens)}
                  </p>
                </motion.div>
              )}

              {/* Bar */}
              {isPlaceholder ? (
                <div className="w-full max-w-12 h-1 rounded-t-md bg-muted" />
              ) : (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPercent, 4)}%` }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="w-full max-w-12 cursor-pointer rounded-t-md bg-primary/80 transition-colors hover:bg-primary"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Labels */}
      <div className="mt-2 flex gap-2">
        {padded.map((d, i) => {
          const key = "_key" in d ? (d._key as string) : d.yearMonth;
          return (
            <div key={key} className="flex-1 text-center text-xs text-muted-foreground">
              {d.yearMonth ? formatMonth(d.yearMonth) : ""}
            </div>
          );
        })}
      </div>
    </div>
  );
}
