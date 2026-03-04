"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { type CriterionConfig } from "@/lib/firebase/firestore";

const CRITERION_TYPES = [
  { value: "output_match", label: "Output Match" },
  { value: "schema_validation", label: "Schema Validation" },
  { value: "tool_usage", label: "Tool Usage" },
  { value: "safety_check", label: "Safety Check" },
  { value: "custom_script", label: "Custom Script" },
  { value: "llm_judge", label: "LLM Judge" },
] as const;

interface CriteriaFormProps {
  criteria: CriterionConfig[];
  onChange: (criteria: CriterionConfig[]) => void;
}

export function CriteriaForm({ criteria, onChange }: CriteriaFormProps) {
  const [addType, setAddType] = useState<CriterionConfig["type"]>("output_match");

  function addCriterion() {
    const id = crypto.randomUUID();
    const defaultConfigs: Record<string, Record<string, unknown>> = {
      output_match: { mode: "contains", pattern: "", caseSensitive: false },
      schema_validation: { jsonSchema: { type: "object" } },
      tool_usage: { expectedTools: [], ordered: false, allowExtra: true },
      safety_check: { forbiddenPatterns: [], scanToolCalls: true },
      custom_script: { code: 'return { passed: true, score: 1, message: "OK" };' },
      llm_judge: { judgeProvider: "anthropic", judgeModel: "claude-sonnet-4-6", rubric: "", scoreThreshold: 0.7 },
    };

    onChange([
      ...criteria,
      {
        id,
        type: addType,
        name: `${addType}_${criteria.length + 1}`,
        config: defaultConfigs[addType] || {},
        weight: 1,
      },
    ]);
  }

  function updateCriterion(index: number, updates: Partial<CriterionConfig>) {
    const updated = [...criteria];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  }

  function removeCriterion(index: number) {
    onChange(criteria.filter((_, i) => i !== index));
  }

  function updateConfig(index: number, key: string, value: unknown) {
    const updated = [...criteria];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, [key]: value },
    };
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      <Label>Criteria</Label>

      {criteria.map((c, i) => (
        <Card key={c.id}>
          <CardHeader className="flex flex-row items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{c.type}</Badge>
              <Input
                value={c.name}
                onChange={(e) => updateCriterion(i, { name: e.target.value })}
                className="h-7 w-40 text-xs"
                placeholder="Criterion name"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Weight:</Label>
              <Input
                type="number"
                value={c.weight}
                onChange={(e) => updateCriterion(i, { weight: Number(e.target.value) })}
                className="h-7 w-16 text-xs"
                min={0}
                step={0.1}
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeCriterion(i)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {renderConfigFields(c, i, updateConfig)}
          </CardContent>
        </Card>
      ))}

      <div className="flex items-center gap-2">
        <Select value={addType} onValueChange={(v) => setAddType(v as CriterionConfig["type"])}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRITERION_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={addCriterion}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}

function renderConfigFields(
  criterion: CriterionConfig,
  index: number,
  updateConfig: (index: number, key: string, value: unknown) => void
) {
  const c = criterion.config;

  switch (criterion.type) {
    case "output_match":
      return (
        <div className="grid gap-2 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Mode</Label>
            <Select
              value={(c.mode as string) || "contains"}
              onValueChange={(v) => updateConfig(index, "mode", v)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="exact">Exact</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Pattern</Label>
            <Input
              value={(c.pattern as string) || ""}
              onChange={(e) => updateConfig(index, "pattern", e.target.value)}
              className="h-8 text-xs"
              placeholder="Expected text or regex..."
            />
          </div>
        </div>
      );

    case "schema_validation":
      return (
        <div>
          <Label className="text-xs">JSON Schema</Label>
          <Textarea
            value={typeof c.jsonSchema === "string" ? c.jsonSchema : JSON.stringify(c.jsonSchema, null, 2)}
            onChange={(e) => {
              try {
                updateConfig(index, "jsonSchema", JSON.parse(e.target.value));
              } catch {
                // Keep raw string while editing
              }
            }}
            className="min-h-[80px] font-mono text-xs"
          />
        </div>
      );

    case "tool_usage":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Expected Tools (comma-separated)</Label>
            <Input
              value={((c.expectedTools as string[]) || []).join(", ")}
              onChange={(e) =>
                updateConfig(
                  index,
                  "expectedTools",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                )
              }
              className="h-8 text-xs"
              placeholder="read, bash, edit"
            />
          </div>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={(c.ordered as boolean) || false}
                onChange={(e) => updateConfig(index, "ordered", e.target.checked)}
              />
              Ordered
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={(c.allowExtra as boolean) ?? true}
                onChange={(e) => updateConfig(index, "allowExtra", e.target.checked)}
              />
              Allow Extra
            </label>
          </div>
        </div>
      );

    case "safety_check":
      return (
        <div className="space-y-2">
          <div>
            <Label className="text-xs">Forbidden Patterns (one per line)</Label>
            <Textarea
              value={((c.forbiddenPatterns as string[]) || []).join("\n")}
              onChange={(e) =>
                updateConfig(
                  index,
                  "forbiddenPatterns",
                  e.target.value.split("\n").filter(Boolean)
                )
              }
              className="min-h-[60px] font-mono text-xs"
              placeholder="<script.*?>&#10;(?:password|secret|api_key)\\s*=&#10;DROP\\s+TABLE"
            />
          </div>
          <label className="flex items-center gap-1 text-xs">
            <input
              type="checkbox"
              checked={(c.scanToolCalls as boolean) ?? true}
              onChange={(e) => updateConfig(index, "scanToolCalls", e.target.checked)}
            />
            Scan tool calls
          </label>
        </div>
      );

    case "custom_script":
      return (
        <div>
          <Label className="text-xs">Script Code</Label>
          <Textarea
            value={(c.code as string) || ""}
            onChange={(e) => updateConfig(index, "code", e.target.value)}
            className="min-h-[80px] font-mono text-xs"
            placeholder='// Available: output, toolCalls&#10;return { passed: true, score: 1, message: "OK" };'
          />
        </div>
      );

    case "llm_judge":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Judge Provider</Label>
            <Input
              value={(c.judgeProvider as string) || "anthropic"}
              onChange={(e) => updateConfig(index, "judgeProvider", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs">Judge Model</Label>
            <Input
              value={(c.judgeModel as string) || ""}
              onChange={(e) => updateConfig(index, "judgeModel", e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Rubric</Label>
            <Textarea
              value={(c.rubric as string) || ""}
              onChange={(e) => updateConfig(index, "rubric", e.target.value)}
              className="min-h-[60px] text-xs"
              placeholder="Evaluate the agent's response for accuracy, completeness, and safety..."
            />
          </div>
          <div>
            <Label className="text-xs">Score Threshold</Label>
            <Input
              type="number"
              value={(c.scoreThreshold as number) || 0.7}
              onChange={(e) => updateConfig(index, "scoreThreshold", Number(e.target.value))}
              className="h-8 text-xs"
              min={0}
              max={1}
              step={0.1}
            />
          </div>
        </div>
      );

    default:
      return <p className="text-xs text-muted-foreground">Unknown criterion type</p>;
  }
}
