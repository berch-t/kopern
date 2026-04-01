"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Download, FileJson, FileSpreadsheet, FileText, FileType } from "lucide-react";

export interface ExportNodeData {
  label: string;
  exportFormat?: "json" | "csv" | "markdown" | "pdf";
  autoDownload?: boolean;
  status?: "idle" | "completed";
}

const FORMAT_CONFIG: Record<string, { icon: typeof FileJson; label: string; color: string }> = {
  json: { icon: FileJson, label: "JSON", color: "text-amber-500" },
  csv: { icon: FileSpreadsheet, label: "CSV", color: "text-emerald-500" },
  markdown: { icon: FileText, label: "Markdown", color: "text-blue-500" },
  pdf: { icon: FileType, label: "PDF", color: "text-red-500" },
};

function ExportNodeComponent({ data, selected }: NodeProps) {
  const d = data as unknown as ExportNodeData;
  const format = d.exportFormat || "json";
  const config = FORMAT_CONFIG[format] || FORMAT_CONFIG.json;
  const Icon = config.icon;
  const isComplete = d.status === "completed";

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed px-4 py-3 shadow-sm transition-all min-w-[160px] ${
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
            <Download className="h-4 w-4 text-emerald-500" />
          ) : (
            <Icon className={`h-4 w-4 ${config.color}`} />
          )}
        </div>
        <div className="min-w-0">
          <span className="text-sm font-semibold">{d.label || "Export"}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 ${config.color}`}>
              {config.label}
            </span>
            {d.autoDownload && (
              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium bg-foreground/5 text-muted-foreground">
                Auto
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ExportNode = memo(ExportNodeComponent);
