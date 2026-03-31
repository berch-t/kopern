"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play, Clock } from "lucide-react";

export interface TriggerNodeData {
  label: string;
  triggerType?: "manual" | "cron" | "webhook";
  cronExpression?: string;
}

const TRIGGER_ICONS = {
  manual: Play,
  cron: Clock,
  webhook: Play,
} as const;

const TRIGGER_COLORS = {
  manual: "border-emerald-500/60 bg-emerald-500/5",
  cron: "border-sky-500/60 bg-sky-500/5",
  webhook: "border-orange-500/60 bg-orange-500/5",
} as const;

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as TriggerNodeData;
  const triggerType = d.triggerType || "manual";
  const Icon = TRIGGER_ICONS[triggerType];
  const colors = TRIGGER_COLORS[triggerType];

  return (
    <div
      className={`relative rounded-full border-2 px-5 py-3 shadow-sm transition-all ${colors} ${
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground/70" />
        <div className="min-w-0">
          <span className="text-sm font-semibold">{d.label || "Start"}</span>
          {d.cronExpression && (
            <p className="text-[10px] text-muted-foreground font-mono">{d.cronExpression}</p>
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

export const TriggerNode = memo(TriggerNodeComponent);
