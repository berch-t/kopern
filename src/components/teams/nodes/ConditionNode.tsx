"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

export interface ConditionNodeData {
  label: string;
  condition?: string;
}

function ConditionNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ConditionNodeData;

  return (
    <div
      className={`relative flex items-center justify-center transition-all ${
        selected ? "drop-shadow-lg" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />

      {/* Diamond shape via rotated square */}
      <div
        className={`w-[100px] h-[100px] rotate-45 rounded-lg border-2 border-amber-500/60 bg-amber-500/5 shadow-sm ${
          selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
        }`}
      />

      {/* Content overlay (counter-rotated) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400 mb-1" />
        <span className="text-xs font-semibold text-center leading-tight max-w-[80px] truncate">
          {d.label || "If"}
        </span>
        {d.condition && (
          <span className="text-[9px] text-muted-foreground text-center max-w-[80px] truncate mt-0.5">
            {d.condition}
          </span>
        )}
      </div>

      {/* Two output handles: left = false, right = true */}
      <Handle
        type="source"
        position={Position.Left}
        id="false"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        className="!w-3 !h-3 !bg-emerald-400 !border-2 !border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="default"
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
