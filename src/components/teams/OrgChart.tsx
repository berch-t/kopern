"use client";

import { useMemo } from "react";
import { computeOrgLayout, type LayoutNode, type LayoutEdge } from "@/lib/teams/layout";
import type { AgentTeamMember, AgentDoc } from "@/lib/firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/FadeIn";
import { Users } from "lucide-react";

const NODE_W = 160;
const NODE_H = 64;
const PADDING = 24;

const ROLE_COLORS: Record<string, string> = {
  coordinator: "#8b5cf6",
  specialist: "#3b82f6",
  reviewer: "#f59e0b",
  researcher: "#10b981",
  communicator: "#ec4899",
  custom: "#6b7280",
};

interface OrgChartProps {
  members: AgentTeamMember[];
  agents: (AgentDoc & { id: string })[];
}

export function OrgChart({ members, agents }: OrgChartProps) {
  const agentNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of agents) map[a.id] = a.name;
    return map;
  }, [agents]);

  const { nodes, edges, width, height } = useMemo(
    () => computeOrgLayout(members, agentNames),
    [members, agentNames],
  );

  if (members.length === 0) {
    return (
      <FadeIn>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No team members</p>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  const svgW = width + PADDING * 2;
  const svgH = height + PADDING * 2;

  return (
    <FadeIn>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Organization</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <svg
            width={svgW}
            height={svgH}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="mx-auto"
          >
            {/* Edges */}
            {edges.map((edge) => {
              const from = nodes.find((n) => n.id === edge.from);
              const to = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const x1 = from.x + PADDING + NODE_W / 2;
              const y1 = from.y + PADDING + NODE_H;
              const x2 = to.x + PADDING + NODE_W / 2;
              const y2 = to.y + PADDING;
              const midY = (y1 + y2) / 2;
              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="text-border"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const roleColor = ROLE_COLORS[node.role] || ROLE_COLORS.custom;
              return (
                <g key={node.id} transform={`translate(${node.x + PADDING}, ${node.y + PADDING})`}>
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    fill="var(--card)"
                    stroke={roleColor}
                    strokeWidth={2}
                    className="drop-shadow-sm"
                  />
                  {/* Role color accent bar */}
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={NODE_H}
                    rx={2}
                    fill={roleColor}
                  />
                  <text
                    x={NODE_W / 2}
                    y={24}
                    textAnchor="middle"
                    className="text-xs font-semibold fill-foreground"
                    style={{ fontSize: 13 }}
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label}
                  </text>
                  <text
                    x={NODE_W / 2}
                    y={44}
                    textAnchor="middle"
                    className="text-[10px] fill-muted-foreground"
                    style={{ fontSize: 11 }}
                  >
                    {node.role}
                  </text>
                </g>
              );
            })}
          </svg>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
