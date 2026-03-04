"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number; // 0.0 - 1.0
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference * (1 - score);

  const sizes = {
    sm: { svgSize: 48, fontSize: "text-xs" },
    md: { svgSize: 72, fontSize: "text-sm" },
    lg: { svgSize: 96, fontSize: "text-lg" },
  };

  const { svgSize, fontSize } = sizes[size];

  const color =
    score >= 0.8
      ? "text-emerald-500"
      : score >= 0.5
        ? "text-yellow-500"
        : "text-destructive";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={svgSize} height={svgSize} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted"
        />
        <motion.circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={color}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <span className={cn("absolute font-bold", fontSize, color)}>
        {percentage}%
      </span>
    </div>
  );
}
