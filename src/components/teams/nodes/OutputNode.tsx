"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag, CheckCircle2 } from "lucide-react";

export interface OutputNodeData {
  label: string;
  aggregation?: "concat" | "last" | "best";
  status?: "idle" | "completed";
}

function OutputNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as OutputNodeData;
  const isComplete = d.status === "completed";

  return (
    <div
      className={`relative rounded-xl border-2 px-4 py-3 shadow-sm transition-all min-w-[160px] ${
        isComplete
          ? "border-emerald-500/60 bg-emerald-500/5"
          : "border-foreground/20 bg-foreground/[0.02]"
      } ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-muted-foreground/40 !border-2 !border-background"
      />

      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isComplete ? "bg-emerald-500/10" : "bg-foreground/5"
        }`}>
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <Flag className="h-4 w-4 text-foreground/70" />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold">{d.label || "Output"}</span>
          {d.aggregation && (
            <p className="text-[10px] text-muted-foreground">
              Mode: {d.aggregation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export const OutputNode = memo(OutputNodeComponent);
