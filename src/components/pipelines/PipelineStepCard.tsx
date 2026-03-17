"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PipelineStep } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import {
  ArrowDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";

interface PipelineStepCardProps {
  step: PipelineStep;
  index: number;
  agentName: string;
  isLast: boolean;
  status?: "pending" | "running" | "completed" | "failed";
  output?: string;
}

export function PipelineStepCard({
  step,
  index,
  agentName,
  isLast,
  status,
  output,
}: PipelineStepCardProps) {
  const t = useDictionary();

  const inputMappingLabel =
    step.inputMapping === "previous_output"
      ? t.pipelines.previousOutput
      : step.inputMapping === "original_input"
        ? t.pipelines.originalInput
        : t.pipelines.customTemplate;

  const statusIcon = {
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
    running: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    failed: <XCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <div className="flex flex-col items-center">
      <Card className="w-full">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
            {index + 1}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{agentName}</span>
              {step.role && (
                <Badge variant="secondary" className="shrink-0">
                  {step.role}
                </Badge>
              )}
              {status && (
                <span className="ml-auto shrink-0">{statusIcon[status]}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{t.pipelines.inputMapping}:</span>
              <span>{inputMappingLabel}</span>
            </div>
            {step.inputMapping === "custom" && step.customInputTemplate && (
              <p className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1 truncate">
                {step.customInputTemplate}
              </p>
            )}
            {step.continueOnError && (
              <Badge variant="outline" className="text-xs">
                {t.pipelines.continueOnError}
              </Badge>
            )}
            {output && (
              <div className="mt-2 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                {output}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <div className="h-4 w-px bg-border" />
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
          <div className="h-4 w-px bg-border" />
        </div>
      )}
    </div>
  );
}
