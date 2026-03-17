"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PipelineStep, AgentDoc } from "@/lib/firebase/firestore";
import { useDictionary } from "@/providers/LocaleProvider";
import { Plus, Trash2, ArrowDown, GripVertical } from "lucide-react";

interface PipelineBuilderProps {
  steps: PipelineStep[];
  agents: (AgentDoc & { id: string })[];
  onStepsChange: (steps: PipelineStep[]) => void;
}

export function PipelineBuilder({
  steps,
  agents,
  onStepsChange,
}: PipelineBuilderProps) {
  const t = useDictionary();

  const addStep = () => {
    onStepsChange([
      ...steps,
      {
        agentId: "",
        role: "",
        order: steps.length,
        inputMapping: steps.length === 0 ? "original_input" : "previous_output",
        continueOnError: false,
      },
    ]);
  };

  const removeStep = (index: number) => {
    const updated = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, order: i }));
    onStepsChange(updated);
  };

  const updateStep = (index: number, patch: Partial<PipelineStep>) => {
    const updated = steps.map((step, i) =>
      i === index ? { ...step, ...patch } : step
    );
    onStepsChange(updated);
  };

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">{t.pipelines.steps}</Label>

      {steps.map((step, index) => (
        <div key={index} className="flex flex-col items-center">
          <Card className="w-full">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select
                    value={step.agentId}
                    onValueChange={(value) =>
                      updateStep(index, { agentId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an agent..." />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.teams.role}</Label>
                  <Input
                    placeholder={t.teams.rolePlaceholder}
                    value={step.role}
                    onChange={(e) =>
                      updateStep(index, { role: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t.pipelines.inputMapping}</Label>
                <Select
                  value={step.inputMapping}
                  onValueChange={(value) =>
                    updateStep(index, {
                      inputMapping: value as PipelineStep["inputMapping"],
                      customInputTemplate:
                        value === "custom" ? step.customInputTemplate ?? "" : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="previous_output">
                      {t.pipelines.previousOutput}
                    </SelectItem>
                    <SelectItem value="original_input">
                      {t.pipelines.originalInput}
                    </SelectItem>
                    <SelectItem value="custom">
                      {t.pipelines.customTemplate}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {step.inputMapping === "custom" && (
                <div className="space-y-2">
                  <Textarea
                    placeholder={t.pipelines.templatePlaceholder}
                    value={step.customInputTemplate ?? ""}
                    onChange={(e) =>
                      updateStep(index, {
                        customInputTemplate: e.target.value,
                      })
                    }
                    rows={3}
                    className="font-mono text-sm"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={step.continueOnError ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    updateStep(index, {
                      continueOnError: !step.continueOnError,
                    })
                  }
                >
                  {t.pipelines.continueOnError}
                </Button>
              </div>
            </CardContent>
          </Card>

          {index < steps.length - 1 && (
            <div className="flex flex-col items-center py-1">
              <div className="h-4 w-px bg-border" />
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <div className="h-4 w-px bg-border" />
            </div>
          )}
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={addStep}
        className="w-full"
      >
        <Plus className="mr-2 h-4 w-4" />
        {t.pipelines.addStep}
      </Button>
    </div>
  );
}
