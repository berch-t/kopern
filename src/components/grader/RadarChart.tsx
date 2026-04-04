"use client";

import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from "recharts";

interface CriterionScore {
  criterion: string;
  label: string;
  score: number; // 0-1
}

interface RadarChartProps {
  data: CriterionScore[];
  size?: number;
}

const CRITERION_LABELS: Record<string, string> = {
  output_match: "Output",
  schema_validation: "Schema",
  tool_usage: "Tools",
  safety_check: "Safety",
  custom_script: "Script",
  llm_judge: "Quality",
};

export function GraderRadarChart({ data, size = 300 }: RadarChartProps) {
  const chartData = data.map((d) => ({
    criterion: CRITERION_LABELS[d.criterion] || d.label || d.criterion,
    score: Math.round(d.score * 100),
    fullMark: 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={size}>
      <RechartsRadar cx="50%" cy="50%" outerRadius="75%" data={chartData}>
        <PolarGrid stroke="rgba(99, 102, 241, 0.2)" />
        <PolarAngleAxis
          dataKey="criterion"
          tick={{ fill: "#94a3b8", fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={{ fill: "#64748b", fontSize: 10 }}
          tickCount={5}
        />
        <Tooltip
          contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
          labelStyle={{ color: "#e2e8f0" }}
          itemStyle={{ color: "#818cf8" }}
          formatter={(value) => [`${value}%`, "Score"]}
        />
        <Radar
          name="Score"
          dataKey="score"
          stroke="#6366f1"
          fill="#6366f1"
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  );
}
