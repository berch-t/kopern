"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";

interface MonitorRadarChartProps {
  breakdown: { criterion: string; label: string; score: number }[];
  baselineBreakdown?: { criterion: string; userScore: number; baselineScore: number }[];
}

export function MonitorRadarChart({ breakdown, baselineBreakdown }: MonitorRadarChartProps) {
  const data = breakdown.map((b) => {
    const baseline = baselineBreakdown?.find(bl => bl.criterion === b.criterion);
    return {
      subject: b.label,
      score: Math.round(b.score * 100),
      baseline: baseline ? Math.round(baseline.baselineScore * 100) : undefined,
      fullMark: 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis
          dataKey="subject"
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
        />
        {baselineBreakdown && (
          <Radar
            name="Baseline"
            dataKey="baseline"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.08}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        )}
        <Radar
          name="Your Score"
          dataKey="score"
          stroke="#22d3ee"
          fill="#22d3ee"
          fillOpacity={0.3}
          strokeWidth={2.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
