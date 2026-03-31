"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AgentRole } from "@/lib/firebase/firestore";

export interface AgentNodeData {
  label: string;
  agentId?: string;
  role?: string;
  roleType?: AgentRole;
  description?: string;
  status?: "idle" | "running" | "completed" | "failed";
}

const ROLE_COLORS: Record<AgentRole, string> = {
  coordinator: "border-violet-500/60 bg-violet-500/5",
  specialist: "border-blue-500/60 bg-blue-500/5",
  reviewer: "border-amber-500/60 bg-amber-500/5",
  researcher: "border-emerald-500/60 bg-emerald-500/5",
  communicator: "border-pink-500/60 bg-pink-500/5",
  custom: "border-gray-500/60 bg-gray-500/5",
};

const ROLE_BADGE: Record<AgentRole, string> = {
  coordinator: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  specialist: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  reviewer: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  researcher: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  communicator: "bg-pink-500/15 text-pink-700 dark:text-pink-400",
  custom: "bg-gray-500/15 text-gray-700 dark:text-gray-400",
};

function StatusIcon({ status }: { status?: AgentNodeData["status"] }) {
  switch (status) {
    case "running":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    default:
      return null;
  }
}

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  const roleType = d.roleType || "custom";
  const borderColor = ROLE_COLORS[roleType];
  const badgeColor = ROLE_BADGE[roleType];

  return (
    <div
      className={`relative rounded-xl border-2 px-4 py-3 shadow-sm transition-all min-w-[180px] max-w-[240px] ${borderColor} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      } ${d.status === "running" ? "shadow-md shadow-blue-500/20" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />

      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 mt-0.5">
          <Bot className="h-4 w-4 text-foreground/70" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{d.label || "Agent"}</span>
            <StatusIcon status={d.status} />
          </div>
          {d.role && (
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium mt-1 ${badgeColor}`}>
              {d.role}
            </span>
          )}
          {d.description && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
